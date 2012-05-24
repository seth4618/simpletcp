// copyright (c) 2012, flashgroup.com
// Use at your own risk.

util = require('util');

// server requires

exports.server = function() {
    var x = require('./tcpserver.js');
    return x.server;
};
exports.LineConnection = function() {
    var x = require('./tcpserver.js');
    return x.LineConnection;
};
exports.JSONConnection = function() {
    var x = require('./tcpserver.js');
    return x.JSONConnection;
};

// client requires

exports.client = function() {
    var x = require('./tcpclient.js');
    return x;
};

// name handling to make things work on unix and windows

exports.cleanPipeName = function(str) {
    if (process.platform === 'win32') {
	str = str.replace(/^\//, '');
	str = str.replace(/\//g, '-');
	return '\\\\.\\pipe\\'+str;
    } else {
	return str;
    }
};

