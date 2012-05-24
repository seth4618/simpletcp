// copyright (c) 2012, flashgroup.com
//
// extern file which defines public interface and can be used with
// closure compiler for type checking.
//
// Use at your own risk.
//

/**
 * TCPClient
 *
 * A vanilla connection to a tcp socket which sends line items.
 * Default behavior is to maintain connection if errors are
 * encountered.  Generic backoff for rety is to do additive delay on
 * failure and reduce to min-delay on success.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {!string} name
 * @param {!string} host
 * @param {number} port
 * @param {function()=} connfunc
 *
 **/
function TCPClient(name, host, port, connfunc) {
}

/**
 * open
 * open a client connection to a server.  If we have a pending request to open it, we return false
 *
 * @private
 * @return {boolean}
 **/
TCPClient.prototype.open = function() {};

/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPClient.prototype.setVerbose = function(flag) {};

/**
 * write
 * <desc>
 *
 * @param {!string} data
 * @return {boolean}
 **/
TCPClient.prototype.write = function(data) {
};

/**
 * writeJSON
 * write an object as json to server
 *
 * @param {!Object} data
 * @return {boolean}
 **/
TCPClient.prototype.writeJSON = function(data) {};

/**
 * close
 * close the connection to the server
 *
 **/
TCPClient.prototype.close = function() {};

/**
 * isQueEmpty
 * return true if inputRecieved loop has no more items
 *
 * @return {boolean}
 **/
TCPClient.prototype.isQueEmpty = function() {};

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
function TCPServer(name, port, conntype) {}

/**
 * start
 **/
TCPServer.prototype.start = function() {};

/**
 * destroy
 * clean up when we want it to go away
 *
 **/
TCPServer.prototype.destroy = function() {};

/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPServer.prototype.setVerbose = function(flag) {};

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
function TCPConnection(server, socket) {}

/**
 * getRemote
 * return remote address (as provided by socket)
 *
 * @return {!string}
 **/
TCPConnection.prototype.getRemote = function() {};

/**
 * setVerbose
 * no args, toggles.  
 *
 * @param {boolean=} flag
 * @return {boolean}
 **/
TCPConnection.prototype.setVerbose = function(flag) {};

/**
 * write
 * write a line over the socket
 *
 * @param {!string} data
 **/
TCPConnection.prototype.write = function(data) {};

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
function JSONConnection(server, socket) {}

/**
 * write
 * write the param in json
 *
 * @param {*} obj
 **/
JSONConnection.prototype.write = function(obj) {};

// Local Variables:
// indent-tabs-mode: nil
// tab-width: 4
// End:
