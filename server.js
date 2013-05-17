"use strict";
var http = require('http')
  , express = require('express')
  , path = require('path')
  , fs = require('fs')
  , logger = require('./logger').get('appium')
  , appium = require('./app/appium')
  , bodyParser = require('./middleware').parserWrap
  , status = require('./app/uiauto/lib/status')
  , appiumVer = require('./package.json').version
  , async = require('async')
  , _ = require("underscore")
  , parser = require('./app/parser')
  , gridRegister = require('./grid_register');

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

var winstonStream = {
  write: function(msg) {
    msg = msg.replace(/$\s*$/m, "");
    msg = msg.replace(/\[[^\]]+\] /, "");
    logger.log('debug', msg);
  }
};

var catchAllHandler = function(e, req, res, next) {
  res.send(500, {
    status: status.codes.UnknownError.code
    , value: "ERROR running Appium command: " + e.message
  });
  next(e);
};

var main = function(args, readyCb, doneCb) {
  if (typeof doneCb === "undefined") {
    doneCb = function() {};
  }
  var rest = express()
    , server = http.createServer(rest);

  rest.configure(function() {
    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    rest.use(allowCrossDomain);
    if (!args.quiet) {
      rest.use(express.logger('dev'));
    }
    if (args.log || args.webhook) {
      rest.use(express.logger({stream: winstonStream}));
    }
    rest.use(bodyParser);
    rest.use(express.methodOverride());
    rest.use(rest.router);
    rest.use(catchAllHandler);
  });

  // Instantiate the appium instance
  var appiumServer = appium(args);

  // Hook up REST http interface
  appiumServer.attachTo(rest);

  var checkSetup = function(cb) {
    var configFile = path.resolve(__dirname, ".appiumconfig");
    fs.readFile(configFile, function(err, data) {
      if (err) {
        logger.error("Could not find config file; looks like config hasn't " +
                     "been run! Please run reset.sh or appium configure.");
        return cb(err);
      }
      var rawConfig;
      try {
        rawConfig = JSON.parse(data.toString('utf8'));
      } catch (e) {
        logger.error("Error parsing configuration json, please re-run config");
        return cb(e);
      }
      var versionMismatches = {};
      _.each(rawConfig, function(deviceConfig, key) {
        if (deviceConfig.version !== appiumVer) {
          versionMismatches[key] = deviceConfig.version;
        }
      });
      if (_.keys(versionMismatches).length) {
        logger.error("Got some configuration version mismatches. Appium is " +
                     "at " + appiumVer + ".");
        _.each(versionMismatches, function(mismatchedVer, key) {
          logger.error(key + " configured at " + mismatchedVer);
        });
        logger.error("Please re-run reset.sh or config");
        return cb(new Error("Appium / config version mismatch"));
      } else {
        appiumServer.registerConfig(rawConfig);
        cb(null);
      }
    });
  };

  var conditionallyPreLaunch = function(cb) {
    if (args.launch) {
      logger.info("Starting Appium in pre-launch mode".cyan);
      appiumServer.preLaunch(function(err) {
        if (err) {
          logger.error("Could not pre-launch appium: " + err);
          cb(err);
        } else {
          cb(null);
        }
      });
    } else {
      cb(null);
    }
  };

  var startListening = function(cb) {
    var alreadyReturned = false;
    server.listen(args.port, args.address, function() {
      var logMessage = "Appium REST http interface listener started on " +
                       args.address + ":" + args.port;
      logger.info(logMessage.cyan);
      if (args.nodeconfig !== null) {
        gridRegister.registerNode(args.nodeconfig);
      }
    });
    server.on('error', function(err) {
      logger.error("Couldn't start Appium REST http interface listener. Requested port is already in use. Please make sure there's no other instance of Appium running already.");
      if (!alreadyReturned) {
        alreadyReturned = true;
        cb(err);
      }
    });
    setTimeout(function() {
      if (!alreadyReturned) {
        alreadyReturned = true;
        cb(null);
      }
    }, 1000);
  };

  async.series([
    checkSetup
    , conditionallyPreLaunch
    , startListening
  ], function(err) {
    if (err) {
      process.exit(1);
    } else if (typeof readyCb === "function") {
      readyCb(appiumServer);
    }
  });

  server.on('close', doneCb);
  return server;
};

if (require.main === module) {
  // Parse the command line arguments
  var args = parser().parseArgs();
  main(args);
}

module.exports.run = main;
