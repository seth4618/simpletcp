util = require('util');

exports.server = function() {
    var x = require('./tcpserver.js');
    return x.server;
}
exports.LineConnection = function() {
    var x = require('./tcpserver.js');
    return x.LineConnection;
}
exports.JSONConnection = function() {
    var x = require('./tcpserver.js');
    return x.JSONConnection;
}
exports.client = function() {
    var x = require('./tcpclient.js');
    return x;
}

