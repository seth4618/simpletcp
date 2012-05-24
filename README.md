A simple tcp server and client wrapper to enable line-by-line
communication, communication of JSON objects, and resilence to server
failure.

## Installation

    npm install https://github.com/seth4618/simpletcp

## Usage

For the server:

    // include this for all servers
    TCPServer = require('simpletcp').server();

    // include this is you are going to be passing json objects back and forth, otherwise use LineConnection
    JSONConnection = require('simpletcp').JSONConnection();

    // If you are doing anything more than simply echoing, you should
    // define a class that will represent each new connection, e.g.,

    function Connection(server, socket) {
        Connection.super_.call(this, server, socket);
        var me = this;
        this.on('data', function(obj) { me.onJSON(obj); });
        this.on('malformed', function(str) { console.log('bad json received: '+str); });
    }
    require('util').inherits(Connection, JSONConnection);

    // called when a new connection has started
    Connection.prototype.start = function()
    {
        this.write({msg: 'feed me'});   // tell client we are alive
    };
    
    
    // do something with objects we get from the client
    Connection.prototype.onJSON = function(obj)
    {
        console.log(obj);
        var a = obj.a || 0;
        var b = obj.b || 0;
        obj.answer = a+b;
        this.write(obj);
    };
    
    // create and start the server on port 8080
    var server = new TCPServer('adder', 8080, Connection);
    server.on('listen', function() {  console.log("Server started"); });
    server.on('connection', function(conn) { conn.start(); });
    server.on('error', function(err) { console.log('Trying to start server Got error: '+err); server.destroy(); });
    server.start();
    
For the client:

    var util=require('util');
    var TCPClient = require('simpletcp').client();
    
    // create a connection to localhost:8080
    var client = new TCPClient('client1',
                               'localhost',
                               8080,
                               function() { 
                                   // called when connection is established
                                   client.writeJSON({a:1, b:3});
                                   client.writeJSON({b:33});
                                   client.writeJSON({a:133});
                                   // we are done
                                   client.close();
                               });
    client.on('data', function(obj) { console.log(obj); });
    // open the connectin
    client.open();


