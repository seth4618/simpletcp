exports.server = function() {
    var x = require('./tcpserver.js');
    return x;
}
exports.client = function() {
    var x = require('./tcpclient.js');
    return x;
}

