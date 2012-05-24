// copyright (c) 2012, flashgroup.com
// Use at your own risk.

var Net = require('net');
var events = require('events');
var util = require('util');

// Emitted events:
// connect: when client is connected to the server
// data: emitted with a complete line of data (argument is a string)
// err: emitted on recieving an error (argument is an Error)
// close: emitted when the connection has been closed or ended

/**
 * TCPClient
 *
 * A vanilla connection to a tcp socket which sends line items.
 * Default behavior is to maintain connection if errors are
 * encountered.  Generic backoff for rety is to do additive delay on
 * failure and reduce to min-delay on success.
 *
 * If going over a unix socket, port will not be specified, and if
 * there is a third arg then it is the connection object.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {!string} name
 * @param {!string} host
 * @param {(number|function())=} port
 * @param {function()=} connfunc
 *
 **/
function TCPClient(name, host, port, connfunc) 
{
    this.name = name;
    this.host = host;
    if ((port == undefined)||(typeof port == 'function')) {
        // this is a connection over a unix socket
        connfunc = (/** @type {function()} */ port);
    } else {
        this.port = port;
    }
    if (!(typeof this.host == "string")) throw new Error("host is not a string");

    this.retryOnEnd = true;        // set to 1 if we always try to reestablish a connection on closure
    this.restartTimer = 0;
    this.status = 0;
    this.errorCount = 0;
    this.buffer = '';
    this.hasItemsInQue = false;
    this.verbose = false;

    // set basic handlers, these can be overridden or set by user
    if (typeof connfunc === 'function') this.on('connect', connfunc);
}
util.inherits(TCPClient, events.EventEmitter);

/** @type {number} */ TCPClient.retryDelta = 5;

//
// basic params to open connection
//

/** @type {!string} */ TCPClient.prototype.name;
/** @type {!string} */ TCPClient.prototype.host;
/** @type {number} */ TCPClient.prototype.port;

//
// internal vars to maintain connection
//

/** @type {!SocketConnection} */ TCPClient.prototype.client;
/** @type {number} */ TCPClient.prototype.status;
/** @type {number} */ TCPClient.prototype.restartTimer;
/** @type {!string} */ TCPClient.prototype.buffer;
/** @type {number} */ TCPClient.prototype.errorCount;
/** @type {boolean} */ TCPClient.prototype.retryOnEnd;
/** @type {boolean} */ TCPClient.prototype.hasItemsInQue;
/** @type {boolean} */ TCPClient.prototype.verbose;

TCPClient.info = function(msg) 
{
    console.log('Info: '+msg);
}

TCPClient.error = function(msg) 
{
    console.log('Error: '+msg);
};

/**
 * makeListenFunction
 * use this to make a listening function.  Just trying to minimize code dup
 *
 * @private
 * @return {!function()}
 **/
TCPClient.prototype.makeListenFunction = function()
{
    var me = this;
    return function () {
        me.status = 1;
        if (this.verbose) TCPClient.info("return from Net.connect for "+me.name);
        me.emit('connect');
    };
};

/**
 * open
 *
 * open a client connection to a server.  If we have a pending request
 * to open it, we return false
 *
 * @private
 * @return {boolean}
 **/
TCPClient.prototype.open = function() 
{
    if (this.restartTimer != 0) return false;

    var vs = "Trying to establish a connection to "+this.name;

    var me = this;
    try {
        var client;
        // open a tcp or unix socket
        if (this.port == undefined) {
            vs += (" unix socket @ "+this.host);
            client = Net.connect(this.host, this.makeListenFunction());
        } else {
            vs += (" server @"+this.host+":"+this.port);
            client = Net.connect(this.port, this.host, this.makeListenFunction());
        }
        if (this.verbose) TCPClient.info(vs);

        this.client = client;
        this.client.on('data', function (b) { me.inputReceived(b); });
        this.client.on('end', function () { me.connectionTerminated(); });
        this.client.on('close', function () { me.connectionTerminated(); });
        this.client.on('error', function (err) { me.errorReceived(err);});
    } catch (err) {
        TCPClient.error('Failed to connected: '+err);
    }
    this.restartTimer = setTimeout(function () { me.checkOpen(); }, 
				                   (TCPClient.retryDelta+me.errorCount)*1000);
    return true;
};


/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPClient.prototype.setVerbose = function(flag)
{
    if (flag == undefined) flag = !this.verbose;
    this.verbose = flag;
    return this.verbose;
};

/**
 * reOpen
 * check that open succeeded
 *
 * @private
 **/
TCPClient.prototype.checkOpen = function() {
    if (this.restartTimer == 0) return;
    this.restartTimer = 0;
    if (this.status == 1) return;
    this.errorCount++;
    if (this.verbose) TCPClient.info("failed to open "+this.name);
    this.open();
};

/**
 * reOpen
 * reOpen a client connection to a server after it was terminated by the server
 *
 * @private
 **/
TCPClient.prototype.reOpen = function() {
    this.restartTimer = 0;
    this.open();
};


/**
 * close
 * close the connection to the server
 *
 **/
TCPClient.prototype.close = function() 
{
    this.retryOnEnd = false;    // don't try and reopen after closure since user requested termination
    this.client.end();
    this.status = 0;
    this.buffer = '';
    if (this.restartTimer != 0) {
        clearTimeout(this.restartTimer);
        this.restartTimer = 0;
    }
};

/**
 * write
 * <desc>
 *
 * @private
 * @param {!string} data
 * @return {boolean}
 **/
TCPClient.prototype.write = function(data) {
    if (this.status == 0) return false;
    this.client.write(data+"\r\n");
    return true;
};

/**
 * inputReceived
 * input received, turn into lines and call linerecieved
 *
 * @private
 * @param {!Buffer} data
 **/
TCPClient.prototype.inputReceived = function(data)
{
    var str = data.toString();
    str = str.replace(/\r/g, '');
    this.buffer += str;
    if (this.verbose) TCPClient.info(this.name+": input: ["+this.buffer+"]");
    var nl = this.buffer.indexOf("\n");
    do {
        if (nl == -1) {
            if (this.verbose) TCPClient.info(this.name+':partial line recieved ['+str+']');
            return;
        }
        var command = this.buffer.substr(0, nl);
        var len = this.buffer.length;
        if (nl+1 == len) {
            this.buffer = '';
        } else {
            this.buffer = this.buffer.substr(nl+1);
            if (this.verbose) TCPClient.info(this.name+':bufffer ['+this.buffer+']');
        }
	    this.errorCount = 0;	// we got back a complete line, underlying connection is good
        nl = this.buffer.indexOf("\n");
        this.hasItemsInQue = (nl != -1);

        this.haveLine(command);
    } while (nl != -1);
};

TCPClient.prototype.haveLine = function(str)
{
    this.emit('data', str);
};

/**
 * isQueEmpty
 * return true if inputRecieved loop has no more items
 *
 * @return {boolean}
 **/
TCPClient.prototype.isQueEmpty = function()
{
    return !this.hasItemsInQue;
}

/**
 * connectionTerminated
 * connection ended or was closed
 *
 * @private
 **/
TCPClient.prototype.connectionTerminated = function()
{
    // indicate closed
    this.status = 0;
    if (this.verbose) TCPClient.info(this.name+': We lost connection');

    if (!this.retryOnEnd) {
        this.emit('close');
        return;
    }
    if (this.verbose) TCPClient.info(this.name+': trying to reopen');

    // try and restart
    var me = this;
    if (this.restartTimer == 0) {
	    this.restartTimer = setTimeout(function () { me.reOpen(); }, 
				                       (TCPClient.retryDelta+me.errorCount)*1000);
    }

    // tell user
    this.emit('close');
};

/**
 * errorReceived
 * error received on connection.  Default behavior is to report and continue.  Will call user if they set an error callback
 *
 * @private
 * @param {!Error} err
 **/
TCPClient.prototype.errorReceived = function(err)
{
    if (this.verbose) TCPClient.error(this.name+':error recieved: '+err); 
    this.errorCount++;
    this.emit('error', err);
};

/**
 * JSONClient
 *
 * A vanilla connection to a tcp/unix socket which sends json objects.
 *
 * @constructor
 * @extends TCPClient
 *
 * @param {!string} name
 * @param {!string} host
 * @param {(number|function())=} port
 * @param {function()=} connfunc
 *
 **/
function JSONClient(name, host, port, connfunc) 
{
    JSONClient.super_.call(this, name, host, port, connfunc);    
}
util.inherits(JSONClient, TCPClient);

JSONClient.prototype.haveLine = function(str)
{
    if (str.indexOf('{') != 0) {
        this.emit('malformed', str);
        return;
    }
    try {
        var obj = JSON.parse(str);
    } catch (err) {
        if (this.verbose) 
            TCPClient.error(this.server.name+"@"+this.getRemote()+" json error:"+err);
        this.emit('malformed', str);
        return;
    }
    this.emit('data', (/** @type {!Object} */ obj));
};

/**
 * write
 * write an object as json to server
 *
 * @param {!Object} data
 * @return {boolean}
 **/
JSONClient.prototype.write = function(data) {
    return TCPClient.prototype.write.call(this, JSON.stringify(data));
};

exports.TCPClient = TCPClient;
exports.JSONClient = JSONClient;


// Local Variables:
// tab-width: 4
// indent-tabs-mode: nil
// End:
