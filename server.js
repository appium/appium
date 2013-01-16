"use strict";
var http = require('http')
  , express = require('express')
  , rest = express()
  , path = require('path')
  , server = http.createServer(rest)
  , appium = require('./app/appium')
  , parser = require('./app/parser');

var main = function(args, readyCb, doneCb) {
  if (typeof doneCb === "undefined") {
    doneCb = function() {};
  }
  // in case we'll support blackberry at some point
  args.device = 'iOS';

  rest.configure(function() {
    var bodyParser = express.bodyParser()
      , parserWrap = function(req, res, next) {
          // wd.js sends us http POSTs with empty body which will make bodyParser fail.
          if (parseInt(req.get('content-length'), 10) <= 0) {
            return next();
          }
          bodyParser(req, res, next);
        };

    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    rest.use(express.logger('dev'));
    rest.use(parserWrap);
    rest.use(express.methodOverride());
    rest.use(rest.router);
  });
  // Instantiate the appium instance
  var appiumServer = appium(args);
  // Hook up REST http interface
  appiumServer.attachTo(rest);
  // Start the web server that receives all the commands
  server.listen(args.port, args.address, function() {
    var logMessage = "Appium REST http interface listener started on "+args.address+":"+args.port;
    console.log(logMessage.cyan);
    if (readyCb) {
      readyCb();
    }
  });
  server.on('close', doneCb);
  return appiumServer;
};

if (require.main === module) {
  // Parse the command line arguments
  var args = parser().parseArgs();
  main(args);
}

module.exports.run = main;
