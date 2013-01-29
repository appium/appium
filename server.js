"use strict";
var http = require('http')
  , express = require('express')
  , path = require('path')
  , logger = require('./logger').get('appium')
  , appium = require('./app/appium')
  , parser = require('./app/parser');

var main = function(args, readyCb, doneCb) {
  var rest = express()
    , server = http.createServer(rest);
  if (typeof doneCb === "undefined") {
    doneCb = function() {};
  }
  // in case we'll support blackberry at some point
  args.device = 'iOS';

  rest.configure(function() {
    var bodyParser = express.bodyParser()
      , parserWrap = function(req, res, next) {
          // wd.js sends us http POSTs with empty body which will make bodyParser fail.
          var cLen = req.get('content-length');
          if (typeof cLen === "undefined" || parseInt(cLen, 10) <= 0) {
            req.headers['content-length'] = 0;
            next();
          } else {
            // hack because python client library sux
            if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
              req.headers['content-type'] = 'application/json';
            }
            bodyParser(req, res, next);
          }
        };
    rest.use(function(req, res, next) {
      next();
    });
    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    if (args.verbose) {
      rest.use(express.logger('dev'));
    }
    rest.use(parserWrap);
    rest.use(express.methodOverride());
    rest.use(rest.router);
  });
  // Instantiate the appium instance
  var appiumServer = appium(args);
  // Hook up REST http interface
  appiumServer.attachTo(rest);
  // Start the web server that receives all the commands
  var next = function(appiumServer) {
    server.listen(args.port, args.address, function() {
      var logMessage = "Appium REST http interface listener started on "+args.address+":"+args.port;
      logger.info(logMessage.cyan);
    });
    if (readyCb) {
      readyCb(appiumServer);
    }
  };
  if (args.launch) {
    logger.info("Starting Appium in pre-launch mode".cyan);
    appiumServer.preLaunch(next);
  } else {
    next(appiumServer);
  }
  server.on('close', doneCb);
  return server;
};

if (require.main === module) {
  // Parse the command line arguments
  var args = parser().parseArgs();
  main(args);
}

module.exports.run = main;
