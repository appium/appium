"use strict";
var http = require('http')
  , express = require('express')
  , path = require('path')
  , logger = require('./logger').get('appium')
  , appium = require('./app/appium')
  , bodyParser = require('./middleware').parserWrap
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
    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    if (args.verbose) {
      rest.use(express.logger('dev'));
    }
    if (args.log) {
      var winstonStream = {
        write: function(msg) {
          msg = msg.replace(/$\s*$/m, "");
          msg = msg.replace(/\[[^\]]+\] /, "");
          logger.log('rest', msg);
        }
      };
      rest.use(express.logger({stream: winstonStream}));
    }
    rest.use(bodyParser);
    rest.use(express.methodOverride());
    rest.use(rest.router);
  });

  // Instantiate the appium instance
  var appiumServer = appium(args);

  // Hook up REST http interface
  appiumServer.attachTo(rest);

  // Start the server either now or after pre-launching device
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
