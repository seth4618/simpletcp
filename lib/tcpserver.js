util = require('util');
var events = require('events');
var Net = require('net');

/**
 * TCPServer
 *
 * A vanilla server over a tcp socket which deals with line items.
 * You must create a subclass to do anything
 *
 * Emits:
 *	listen()			when we sucessfully listening
 *	close()				when the server is closed
 *	error(err)			when an error occurs
 *  connection(conn)	when a new connection is made, the TCPConnection object is provided.
 *
 * @constructor
 * @extends EventEmitter
 * @param {!string} name
 * @param {number} port
 * @param {function(new: TCPConnection):?=} conntype
 *
 **/
function TCPServer(name, port, conntype) {
    this.name = name;
    this.port = port;
    this.verbose = false;
    if (conntype == undefined) conntype = TCPConnection;
    this.connClass = conntype;
}
util.inherits(TCPServer, events.EventEmitter);

/** @type {!string} */ TCPServer.prototype.name;
/** @type {number} */ TCPServer.prototype.port;
/** @type {boolean} */ TCPServer.prototype.verbose;
/** @type {!function(new: TCPConnection):?} */ TCPServer.prototype.connClass;
/** @type {!net.Server} */ TCPServer.prototype.server;

/**
 * start
 **/
TCPServer.prototype.start = function() {
    var me = this;
    var server = Net.createServer(function(c) { 
            if (me.verbose) Util.info("new connection!"); 
            me.onConnect(c); });
    server.on('error', function(err) { me.onError(err); });
    server.on('close', function() { me.emit('close'); });
    try {
        server.listen(this.port, function() { me.onListening(); });
    } catch (err) {
        if (me.verbose) me.OnError(err);
    }
    this.server = server;
};

/**
 * onError
 * @private
 **/
TCPServer.prototype.onError = function(err) {
    if (this.verbose) Util.info('Got error for server '+this.name+' on port:'+this.port);
    this.emit('error', err);
};

/**
 * onListening
 * called when we are bound to a port.  default behavior is to just report it on the log
 * @private
 **/
TCPServer.prototype.onListening = function() {
    if (this.verbose) Util.info(this.name+" server bound @"+this.port);
    this.emit('listen');
};

/**
 * onConnect
 * called when we get a new connection.  setup various event handlers
 *
 * @private
 * @param {!SocketConnection} c
 **/
TCPServer.prototype.onConnect = function(c) {
    // init
    if (this.verbose) Util.info(this.name+':server connected to: '+c.remoteAddress);
    
    var connObject = new this.connClass(this, c);
    
    // setup handlers
    c.on('end', function() { connObject.onEnd(); });
    c.on('data', function(data) { connObject.onData(data); });
    c.on('error', function(err) { connObject.onError(err); });
    c.on('timeout', function() { connObject.onTimeout(); });

    // tell connection it can start
    this.emit('connection', connObject);
};

/**
 * destroy
 * clean up when we want it to go away
 *
 **/
TCPServer.prototype.destroy = function() {
    // in case we need to close it.
    this.removeAllListeners('listen');
    this.removeAllListeners('close');
    this.removeAllListeners('connection');
    this.removeAllListeners('error');
    this.server.close();
};

/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPServer.prototype.setVerbose = function(flag)
{
    if (flag == undefined) flag = !this.verbose;
    this.verbose = flag;
    return this.verbose;
};

////////////////////////////////////////////////////////////////

/**
 * TCPConnection
 *
 * a basic tcp connection.  provides default behavior for forwarding
 * complete lines, writing lines, doing nothing with timeouts, errors,
 * closing, etc.
 *
 * Emits:
 *  connect()		when a connection is started
 *	end()			when connection is done
 *	data(str)		a line of data that was recieved
 *	error(err)		when an error occurs
 *  timeout()		when a timeout was recieved on the underlying socket
 *
 * @constructor
 * @extends EventEmitter
 * @param {!TCPServer} server
 * @param {!SocketConnection} socket
 **/
function TCPConnection(server, socket)
{
    this.server = server;
    this.socket = socket;
    this.buffer = '';
    this.verbose = server.verbose;
    if (this.verbose) 
        Util.info("Set up a new connection for "+this.server.name+" with "+this.remote);
    this.on('error', function() {});
}
util.inherits(TCPConnection, events.EventEmitter);

/**
 * @type {!string}
 */
TCPConnection.prototype.buffer;

/**
 * @type {!TCPServer}
 */
TCPConnection.prototype.server;

/**
 * @type {!SocketConnection}
 */
TCPConnection.prototype.socket;

/**
 * @type {boolean}
 */
TCPConnection.prototype.verbose;

/**
 * getRemote
 * return remote address (as provided by socket)
 *
 * @return {!string}
 **/
TCPConnection.prototype.getRemote = function()
{
    return this.socket.remoteAddress;
}

/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPConnection.prototype.setVerbose = function(flag)
{
    if (flag == undefined) flag = !this.verbose;
    this.verbose = flag;
    return this.verbose;
};

/**
 * onEnd
 * called when a connection is termainted by client
 * default behavior is do nothing but report and tell server
 *
 * @private
 **/
TCPConnection.prototype.onEnd = function() {
    if (this.verbose) 
        Util.info(this.server.name+':disconnected from '+this.getRemote());
    this.socket.destroy(this);
    this.emit('end');
};

/**
 * onData
 * called when we get data
 * default behavior is break into lines and emit data with the line
 *
 * @private
 * @param {!Buffer} data
 **/
TCPConnection.prototype.onData = function(data) {
    var str = data.toString();
    str = str.replace(/\r/g, '');
    if (this.verbose) 
        Util.info(this.server.name+"@"+this.socket.remoteAddress+" <- ["+str+"]");
    this.buffer += str;
    var nl = this.buffer.indexOf("\n");
    do {
        //Util.info('buffer:'+nl+':'+this.buffer);
        if (nl == -1) {
            if (this.verbose) 
                Util.info('partial line recieved ['+str+']');
            return;
        }
        var command = this.buffer.substr(0, nl);
        var len = this.buffer.length;
        if (nl+1 == len) {
            this.buffer = '';
        } else {
            this.buffer = this.buffer.substr(nl+1);
        }
        //Util.info('checking length of ['+command+']');
        if (command.length != 0) {
            this.lineReceived(command);
        }
        nl = this.buffer.indexOf("\n");
    } while (nl != -1);
};

/**
 * lineReceived
 * got a line of data
 *
 * @private
 * @param {!string} str
 **/
TCPConnection.prototype.lineReceived = function(str)
{
    this.emit('data', str);    
};

/**
 * onError
 * called when we get an error
 * default behavior is do nothing but report
 *
 * @private
 * @param {!Error} err
 **/
TCPConnection.prototype.onError = function(err) {
    if (this.verbose) 
        Util.info(this.server.name+':error on connection from '+this.socket.remoteAddress+': '+err);
    
    var any = this.listeners('error');
    if (any.length == 0) {
        Util.info('no listeners for an error, should I die?');
        return;
    }

    this.emit('error', err);
};

/**
 * onTimeout
 * called when a connection times out.  
 * default behavior is do nothing but report
 *
 * @private
 **/
TCPConnection.prototype.onTimeout = function(c) {
    if (this.verbose) 
        Util.info(this.server.name+':timeout on connection '+this.socket.remoteAddress);
    this.emit('timeout');
};

/**
 * write
 * write a line over the socket (newline stuff added here)
 *
 * @param {!string} data
 **/
TCPConnection.prototype.write = function(data) 
{
    this.socket.write(data+"\r\n");
};

////////////////////////////////////////////////////////////////

/**
 * JSONConnection
 * A tcp socket to a server which talks json in line chunks
 *
 * Emits:
 *	end()			when connection is done
 *	data(obj)		when we get a complete json object (that must come on ONE line)
 *  malformed(str)	when a json error occurs (the string that caused it is included)
 *	error(err)		when any other kind of error occurs
 *  timeout()		when a timeout was recieved on the underlying socket
 *
 * @constructor
 * @extends {TCPConnection}
 *
 * @param {!TCPServer} server
 * @param {!SocketConnection} socket
 *
 **/
function JSONConnection(server, socket)
{
    JSONConnection.super_.call(this, server, socket);
}
util.inherits(JSONConnection, TCPConnection);

/**
 * lineReceived
 * called when we get a complete line, turns into json and emits either 'data' or 'malformed'
 *
 * @private
 * @param {!string} data
 **/
JSONConnection.prototype.lineReceived = function(data) 
{
    if (this.verbose) 
        Util.info(this.server.name+"@"+this.socket.remoteAddress+" <= ["+data+"]");

    if (data.indexOf('{') != 0) {
        this.emit('malformed', data);
        return;
    }
    try {
        var obj = JSON.parse(data);
    } catch (err) {
        if (this.verbose) 
            Util.error(this.server.name+"@"+this.remote+" json error:"+err);
        this.emit('malformed', data);
        return;
    }
    // sucessful parsing, process object
    this.emit('data', (/** @type {!Object} */ obj));
};

/**
 * write
 * write the param in json
 *
 * @param {*} obj
 **/
JSONConnection.prototype.write = function(obj)
{
    var s = JSON.stringify(obj);
    TCPConnection.prototype.write.call(this, s);
};

var Util = {};
Util.info = function(x) { console.log(x) };
Util.error = function(x) { console.log('Error: '+x); };

exports.server = TCPServer;
exports.LineConnection = TCPConnection;
exports.JSONConnection = JSONConnection;

// Local Variables:
// indent-tabs-mode: nil
// tab-width: 4
// End:
