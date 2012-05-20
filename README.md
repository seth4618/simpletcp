A simple tcp server and client wrapper to enable line-by-line
communication, communication of JSON objects, and resilence to server
failure.

## Installation

    npm install https://github.com/seth4618/simpletcp

## Usage

var TCPClient = require('./tcpclient.js');

// create a connection to localhost:8081, when connected call onConnection
var client = new TCPClient('hc', 'localhost', '8081', onConnection);

// register a callback function for each line received
client.setInputHandler(executeResponse);

// register a callback function for a losing the connection
client.setEndHandler(serverDisabled);

