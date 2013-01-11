var http = require('http')
  , url = require('url')
  , express = require('express')
  , app = express()
  , path = require('path')
  , server = http.createServer(app)
  , colors = require('colors')
  , routing = require('./app/routing')
  , appium = require('./app/appium')
  , parser = require('./app/parser');

session = {
  sessionId: null
  , client: null
  , queue: []
};

app.configure(function() {
  app.use(express.favicon());
  app.use(express.static(path.join(__dirname, '/app/static')));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

// Import the routing rules
routing(app);

// Parse the command line arguments
var args = parser().parseArgs();

// Instantiate the appium client
session.client = appium(args.app, args.UDID, args.verbose);

// Start the web server that receives all the commands
server.listen(args.port, args.address, function() {
  session.sessionId = new Date().getTime();
  var logMessage = "Appium session "+session.sessionId+" started on "+args.address+":"+args.port;
  console.log(logMessage.cyan);
});
