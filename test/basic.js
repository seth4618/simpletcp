// test starting a server, starting clients, echoing messages, notification of being done

var assert = require('assert');
var TCPClient=require('..').client();
var server=require('..').server().server.server;
var LineConnection=require('..').server().server.LineConnection;

var allfinished = 0;
var serverstarted = 0;

function MyConnection(server, socket)
{
    MyConnection.super_.call(this, server, socket);
}
util.inherits(MyConnection, LineConnection);

MyConnection.prototype.start = function()
{
    this.write("Hello");
};

MyConnection.prototype.onInputReceived = function(str)
{
    //console.log('got '+str);
    this.write("I just got: "+str);
};

function TestServer(port)
{
    TestServer.super_.call(this, 'test', port);
}
util.inherits(TestServer, server);

TestServer.enabled = false;

TestServer.init = function(port, cb)
{
    //console.log("Trying: "+port);
    TestServer.cb = cb;
    TestServer.server = new TestServer(port);
    TestServer.server.start();
};

TestServer.prototype.onListening = function() {
    TestServer.enabled = true;
    TestServer.cb();
};

TestServer.prototype.onError = function(err) 
{
    if (err.code == EADDRINUSE) TestServer.enabled = false;
    else {
	console.log("unknown error: "+err);
    }
};

TestServer.prototype.setupConnection = function(conn) 
{
    return new MyConnection(this, conn);
};

function findport(port) {
    TestServer.init(port, startClientTest);
    setTimeout(function() {
	    if (TestServer.enabled == true) return;
	    if (port < 9000) return findport(port+1);
	    console.log("Could not find a port to listen on");
	    process.exit(-1);
	}, 200);
}

function TestClient(port)
{
    var me = this;
    this.client = new TCPClient('tc-'+TestClient.id, 
				'localhost',
				port,
				function() { 
				    //console.log(me.client.name+" is connected"); 
				    me.runtest(); });
    TestClient.id++;
    this.client.on('data', function(str) { me.executeResponse(str); });
    this.client.on('end', function() { me.serverDisabled(); });
    this.client.on('close', function() { me.finished(); });
    this.count = 0;
    this.client.open();
    //console.log("Created client on "+port);
}

TestClient.id = 0;
TestClient.clientsDone = 0;
TestClient.clientsToTest = 10;

TestClient.prototype.client;
TestClient.prototype.count = 0;

TestClient.prototype.executeResponse = function(str) 
{
    //console.log("client: "+this.client.name+" says ["+str+"]");
    var me = this;
    if (this.count < 10) {
	setTimeout(function() { 
		//console.log('writing '+me.count); 
		me.client.write('Hi:'+me.count); 
		me.count++; }, 200);
    } else {
	this.client.close();
    }
};

TestClient.prototype.finished = function() 
{
    //console.log("client: is done");
    TestClient.clientsDone++;
    if (TestClient.clientsDone == TestClient.clientsToTest) {
	allfinished = 1;
    }
};

TestClient.prototype.runtest = function() 
{
    this.client.write('Hi');
};

function startClientTest()
{
    serverstarted = 1;

    var useport = TestServer.server.port;
    console.log("Server started.  Clients to run on "+useport);

    var clients = [];
    for (i=0; i<TestClient.clientsToTest; i++) {
	clients.push(new TestClient(useport));
    }
}

var timer = 1000;
function tooktoolong() 
{
    if (timer-- < 0) {
	console.log("Test timed out");
	process.exit(-1);
    }

    if ((timer % 10)==0) {
	console.log(timer+" still executing ..."+serverstarted+" "+TestClient.clientsDone);
    }

    if (!serverstarted || !allfinished) {
	setTimeout(tooktoolong, 250);
	return;
    }
    process.exit(0);
}
setTimeout(tooktoolong, 250);

////////////////////////////////////////////////////////////////
// main entry point

findport(8000);


// Local Variables:
// tab-width: 4
// indent-tabs-mode: nil
// End:




