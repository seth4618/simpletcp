// test starting a server, starting clients, echoing messages, notification of being done

var assert = require('assert');
var TCPClient=require('..').client();
var TCPServer=require('..').server();

var showAll = false;            // set to true if you want to see all kinds of logging info
var allfinished = 0;
var serverstarted = 0;
var useport = 0;

function startConnection(conn)
{
    conn.on('data', function(str) {     conn.write("I just got: "+str); });
    conn.on('connect', function(str) {  conn.write("Hi"); });
    //conn.on('end', function() { console.log('connection is done')f; });
    conn.setVerbose(showAll);
}

function startServer(port, cb)
{
    var server = new TCPServer('test', port);
    console.log(server);
    server.on('listen', function() { useport = port; cb(); });
    server.on('connection', function(conn) { startConnection(conn); });
    server.on('error', function(err) { console.log('Trying to start server Got error: '+err); server.destroy(); });
    server.setVerbose(showAll);
    server.start();
}

function findport(port) {
    startServer(port, startClientTest);
    setTimeout(function() {
	    if (serverstarted == 1) return;
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




