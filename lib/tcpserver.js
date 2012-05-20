util = require('util');
var Net = require('net');

/**
 * TCPServer
 *
 * A vanilla server over a tcp socket which deals with line items.
 * You must create a subclass to do anything
 *
 * @constructor
 * @param {!string} name
 * @param {number} port
 *
 **/
function TCPServer(name, port) {
    this.name = name;
    this.port = port;
    this.verbose = false;
}

/** @type {!string} */ TCPServer.prototype.name;
/** @type {number} */ TCPServer.prototype.port;
/** @type {boolean} */ TCPServer.prototype.verbose;

/**
 * start
 **/
TCPServer.prototype.start = function() {
    var me = this;
    var server = Net.createServer(function(c) { 
            if (me.verbose) Util.info("new connection!"); 
            me.onConnect(c); });
    server.on('error', function(err) { 
            if (me.verbose) Util.info('got error:'+err.code);  });
    try {
        server.listen(this.port, function() { me.onListening(); });
    } catch (err) {
        if (me.verbose) Util.info("Got error: "+err);
    }
};

/**
 * onError
 **/
TCPServer.prototype.onError = function(err) {
    if (this.verbose) Util.info('Got error for server '+this.name+' on port:'+this.port);
};

/**
 * onListening
 * called when we are bound to a port.  default behavior is to just report it on the log
 *
 **/
TCPServer.prototype.onListening = function() {
    if (this.verbose) Util.info(this.name+" server bound @"+this.port);
};

/**
 * onConnect
 * called when we get a new connection.  setup various event handlers
 *
 * @param {!SocketConnection} c
 **/
TCPServer.prototype.onConnect = function(c) {
    // init
    if (this.verbose) Util.info(this.name+':server connected to: '+c.remoteAddress);
    var me = this;
    var connObject = this.setupConnection(c);
    
    // setup handlers
    c.on('end', function() { connObject.onEnd(); });
    c.on('data', function(data) { connObject.onData(data); });
    c.on('error', function(err) { connObject.onError(err); });
    c.on('timeout', function() { connObject.onTimeout(); });

    // tell connection it can start
    connObject.start();
};

/**
 * setupConnection
 *
 * create a connection object for this connection.  SHOULD BE
 * SUBCLASSED IF YOU WANT TO DO ANYTHING INTERESTING
 *
 * @param {!SocketConnection} conn
 * @return {!TCPConnection}
 **/
TCPServer.prototype.setupConnection = function(conn)
{
    var c = new TCPConnection(this, conn);
    return c;
};

/**
 * destroy
 *
 * indicate a connection is no longer viable and we can clean it up
 *
 * @param {!TCPConnection} conn
 **/
TCPServer.prototype.destroy = function(conn)
{
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
 * @constructor
 * @param {!TCPServer} server
 * @param {!SocketConnection} socket
 **/
function TCPConnection(server, socket)
{
    this.server = server;
    this.socket = socket;
    this.remote = socket.remoteAddress;
    this.buffer = '';
    this.verbose = server.verbose;
    if (this.verbose) 
        Util.info("Set up a new connection for "+this.server.name+" with "+this.remote);
}

/**
 * @type {!string}
 */
TCPConnection.prototype.buffer;

/**
 * remote ip of connection (used only for reporting)
 * @type {!string}
 */
TCPConnection.prototype.remote;

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
 * start
 * indicate we are ready to use this connection
 *
 **/
TCPConnection.prototype.start = function()
{
};

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
 **/
TCPConnection.prototype.onEnd = function() {
    if (this.verbose) 
        Util.info(this.server.name+':disconnected from '+this.remote);
    this.server.destroy(this);
};

/**
 * onData
 * called when we get data
 * default behavior is break into lines and call onInputReceived
 *
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
            this.onInputReceived(command);
        }
        nl = this.buffer.indexOf("\n");
    } while (nl != -1);
};

/**
 * onError
 * called when we get an error
 * default behavior is do nothing but report
 *
 * @param {!Error} err
 **/
TCPConnection.prototype.onError = function(err) {
    if (this.verbose) 
        Util.info(this.server.name+':error on connection from '+this.socket.remoteAddress+': '+err);
};

/**
 * onTimeout
 * called when a connection times out.  
 * default behavior is do nothing but report
 *
 **/
TCPConnection.prototype.onTimeout = function(c) {
    if (this.verbose) 
        Util.info(this.server.name+':timeout on connection '+this.socket.remoteAddress);
};

/**
 * onInputReceived
 * called when we get a complete line
 * default behavior is do nothing but report
 * SUBCLASS THIS
 *
 * @param {!string} data
 **/
TCPConnection.prototype.onInputReceived = function(data) 
{
    if (this.verbose) 
        Util.info(this.server.name+"@"+this.socket.remoteAddress+" <= ["+data+"]");
};

/**
 * write
 * write a line over the socket
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
 * @constructor
 * @extends {TCPConnection}
 *
 * @param {!TCPServer} server
 * @param {!SocketConnection} socket
 *
 **/
function JSONConnection(server, socket)
{
    Util.info('JSONConnection new');
    JSONConnection.super_.call(this, server, socket);
}
util.inherits(JSONConnection, TCPConnection);


/**
 * onMalFormedInput
 * called when we get a bad json object
 *
 * @param {string} str
 **/
JSONConnection.prototype.onMalFormedInput = function(str)
{
    $assert(false, "needs to be overridden in subclass");
};

/**
 * onJSONReceived
 * filter the string and return the result
 *
 * @private
 * @param {!Object} obj
 **/
JSONConnection.prototype.onJSONReceived = function(obj)
{
    $assert(false, "needs to be overridden in subclass");
};

/**
 * onInputReceived
 * called when we get a complete line, turns into json and calls either: onJSONReceived or onMalFormedInput
 *
 * @param {!string} data
 **/
JSONConnection.prototype.onInputReceived = function(data) 
{
    if (this.verbose) 
        Util.info(this.server.name+"@"+this.socket.remoteAddress+" <= ["+data+"]");

    if (data.indexOf('{') != 0) {
        this.onMalFormedInput(data);
        return;
    }
    try {
        var obj = JSON.parse(data);
        //console.log(obj);
    } catch (err) {
        if (this.verbose) 
            Util.error(this.server.name+"@"+this.remote+" json error:"+err);
	    this.onMalFormedInput(data);
	    return;
    }
    // sucessful parsing, process object
    this.onJSONReceived((/** @type {!Object} */ obj));
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
    TCPConnection.prototype.write.call(this, s+'\r\n');
};

var Util = {};
Util.info = function(x) { console.log(x) };
Util.error = function(x) { console.log('Error: '+x); };

var exporting = {
    server: TCPServer,
    LineConnection: TCPConnection,
    JSONConnection: JSONConnection
};

exports.server = exporting;

// Local Variables:
// indent-tabs-mode: nil
// tab-width: 4
// End:
