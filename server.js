var http = require('http')
  , url = require('url')
  , express = require('express')
  , rest = express()
  , path = require('path')
  , server = http.createServer(rest)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , appium = require('./app/appium')
  , parser = require('./app/parser');

rest.configure(function() {
  rest.use(express.favicon());
  rest.use(express.static(path.join(__dirname, '/app/static')));
  rest.use(express.logger('dev'));
  rest.use(express.bodyParser());
  rest.use(express.methodOverride());
  rest.use(rest.router);
});

// Parse the command line arguments
var args = parser().parseArgs();

// Instantiate the appium instance
var appium = appium(args.app, args.UDID, args.verbose);
// Hook up REST http interface
appium.attachTo(rest);

// Start the web server that receives all the commands
server.listen(args.port, args.address, function() {
  var logMessage = "Appium REST http interface listener started on "+args.address+":"+args.port;
  console.log(logMessage.cyan);
});
