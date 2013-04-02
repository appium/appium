"use strict";
var http = require('http')
  , express = require('express')
  , path = require('path')
  , logger = require('./logger').get('appium')
  , appium = require('./app/appium')
  , bodyParser = require('./middleware').parserWrap
  , status = require('./app/uiauto/lib/status')
  , parser = require('./app/parser');

var main = function(args, readyCb, doneCb) {
  var rest = express()
    , server = http.createServer(rest);
  if (typeof doneCb === "undefined") {
    doneCb = function() {};
  }

  // in case we'll support blackberry at some point
  args.device = 'iOS';

  var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS,DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type, accept');

    // need to respond 200 to OPTIONS

    if ('OPTIONS' == req.method) {
      res.send(200);
    } else {
      next();
    }
  };

  rest.configure(function() {
    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    rest.use(allowCrossDomain);
    if (args.verbose) {
      rest.use(express.logger('dev'));
    }
    if (args.log || args.webhook) {
      var winstonStream = {
        write: function(msg) {
          msg = msg.replace(/$\s*$/m, "");
          msg = msg.replace(/\[[^\]]+\] /, "");
          logger.log('debug', msg);
        }
      };
      rest.use(express.logger({stream: winstonStream}));
    }
    rest.use(bodyParser);
    rest.use(express.methodOverride());
    rest.use(rest.router);
    // catch all error handler
    rest.use(function(e, req, res, next) {
      res.send(500, {
        status: status.codes.UnknownError.code
        , value: "ERROR running Appium command: " + e.message
      });
      next(e);
    });
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
    server.on('error', function(err) {
      logger.error("Couldn't start Appium REST http interface listener. Requested port is already in use. Please make sure there's no other instance of Appium running already.");
    });
    if (readyCb) {
      readyCb(appiumServer);
    }
  };

  if (args.launch) {
    logger.info("Starting Appium in pre-launch mode".cyan);
    appiumServer.preLaunch(function(err, appiumServer) {
      if (err) {
        logger.error("Could not pre-launch appium: " + err);
        process.exit(1);
      } else {
        next(appiumServer);
      }
    });
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
