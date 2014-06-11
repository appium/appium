"use strict";

var helpers = require('../helpers.js')
  , isWindows = helpers.isWindows()
  , isMac = helpers.isMac()
  , iosConfigured = helpers.iosConfigured
  , macVersionArray = helpers.macVersionArray
  , _ = require("underscore")
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , path = require('path')
  , endInstrumentsPath = path.resolve(__dirname, '../../build/force_quit/ForceQuitUnresponsiveApps.app/Contents/MacOS/ForceQuitUnresponsiveApps')
  , gridRegister = require('./grid-register.js')
  , logger = require('./logger.js').get('appium')
  , status = require('./status.js')
  , async = require('async')
  , through = require('through')
  , io = require('socket.io')
  , mkdirp = require('mkdirp')
  , bytes = require('bytes');

var watchForUnresponsiveInstruments = function (cb) {
  if (isWindows) return;

  var endOldProcess = function (cb) {
    exec("killall -9 ForceQuitUnresponsiveApps", { maxBuffer: 524288 }, function () { cb(); });
  };

  var cleanLogs = function (data) {
    var re = /[0-9\-:. ]+ForceQuitUnresponsiveApps\[[0-9:]+\] /g;
    return data.replace(re, '');
  };

  var startNewprocess = function (cb) {
    logger.debug("Spawning instruments force-quitting watcher process");
    var process = spawn(endInstrumentsPath);
    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    process.stderr.pipe(through(function (data) {
      logger.debug('[FQInstruments STDERR] ' + cleanLogs(data.trim()));
    }));

    process.stdout.pipe(through(function (data) {
      logger.debug('[FQInstruments] ' + cleanLogs(data.trim()));
    }));

    cb();
  };

  macVersionArray(function (err, versions) {
    if (err) return cb(err);
    if (versions[1] >= 9) {
      async.series([
        endOldProcess,
        startNewprocess
      ], cb);
    } else {
      logger.debug("Not spawning instruments force-quit watcher since it " +
                  "only works on 10.9 and you have " + versions.join("."));
      cb();
    }
  });
};

module.exports.allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS,DELETE');
  res.header('Access-Control-Allow-Headers', 'origin, content-type, accept');

  // need to respond 200 to OPTIONS

  if ('OPTIONS' === req.method) {
    res.send(200);
  } else {
    next();
  }
};

module.exports.winstonStream = {
  write: function (msg) {
    msg = msg.replace(/$\s*$/m, "");
    msg = msg.replace(/\[[^\]]+\] /, "");
    logger.log('debug', msg);
  }
};

module.exports.catchAllHandler = function (e, req, res, next) {
  res.send(500, {
    status: status.codes.UnknownError.code
  , value: "ERROR running Appium command: " + e.message
  });
  next(e);
};

module.exports.checkArgs = function (args) {
  var exclusives = [
    ['noReset', 'fullReset']
    , ['ipa', 'safari']
    , ['app', 'safari']
    , ['forceIphone', 'forceIpad']
    , ['deviceName', 'defaultDevice']
  ];

  _.each(exclusives, function (exSet) {
    var numFoundInArgs = 0;
    _.each(exSet, function (opt) {
      if (_.has(args, opt) && args[opt]) {
        numFoundInArgs++;
      }
    });
    if (numFoundInArgs > 1) {
      console.error(("You can't pass in more than one argument from the set " +
        JSON.stringify(exSet) + ", since they are mutually exclusive").red);
      process.exit(1);
    }
  });
};

module.exports.noColorLogger = function (tokens, req, res) {
  var len = parseInt(res.getHeader('Content-Length'), 10);

  len = isNaN(len) ? '' : ' - ' + bytes(len);
  return req.method + ' ' + req.originalUrl + ' ' +
    res.statusCode + ' ' + (new Date() - req._startTime) + 'ms' + len;
};

module.exports.configureServer = function (rawConfig, appiumVer, appiumServer,
    cb) {
  var appiumRev;

  if (!rawConfig) {
    return cb(new Error('config data required'));
  }

  var versionMismatches = {};
  var excludedKeys = ["git-sha", "node_bin", "built"];
  _.each(rawConfig, function (deviceConfig, key) {
    if (deviceConfig.version !== appiumVer && !_.contains(excludedKeys, key)) {
      versionMismatches[key] = deviceConfig.version;
    } else if (key === "git-sha") {
      appiumRev = rawConfig['git-sha'];
    }
  });
  if (_.keys(versionMismatches).length) {
    logger.error("Got some configuration version mismatches. Appium is " +
                 "at " + appiumVer + ".");
    _.each(versionMismatches, function (mismatchedVer, key) {
      logger.error(key + " configured at " + mismatchedVer);
    });
    logger.error("Please re-run reset.sh or config");
    return cb(new Error("Appium / config version mismatch"));
  } else {
    appiumServer.registerConfig(rawConfig);
    cb(null, appiumRev);
  }
};

module.exports.conditionallyPreLaunch = function (args, appiumServer, cb) {
  if (args.launch) {
    logger.debug("Starting Appium in pre-launch mode");
    appiumServer.preLaunch(function (err) {
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

module.exports.prepareTmpDir = function (args, cb) {
  if (args.tmpDir === null) return cb();
  mkdirp(args.tmpDir, function (err) {
    if (err) {
      logger.error("Could not ensure tmp dir '" + args.tmpDir + "' exists");
      logger.error(err);
    }
    cb(err);
  });
};

var startAlertSocket = function (restServer, appiumServer) {
  var alerts = io(restServer, {
    'flash policy port': -1,
    'logger': logger,
    'log level': 1,
    'polling duration': 10,
    'transports': ['websocket', 'flashsocket']
  });

  alerts.sockets.on("connection", function (socket) {
    logger.debug("Client connected: " + (socket.id).toString());

    socket.on('disconnect', function (data) {
      logger.debug("Client disconnected: " + data);
    });
  });

  // add web socket so we can emit events
  appiumServer.attachSocket(alerts);
};

var getNonDefaultArgs = function (parser, args) {
  var nonDefaults = {};
  _.each(parser.rawArgs, function (rawArg) {
    var arg = rawArg[1].dest;
    if (args[arg] !== rawArg[1].defaultValue) {
      nonDefaults[arg] = args[arg];
    }
  });
  return nonDefaults;
};

module.exports.startListening = function (server, args, parser, appiumVer, appiumRev, appiumServer, cb) {
  var alreadyReturned = false;
  server.listen(args.port, args.address, function () {
    if (isMac && iosConfigured() && args.forceQuitInstruments) {
      watchForUnresponsiveInstruments(function () {});
    }
    var welcome = "Welcome to Appium v" + appiumVer;
    if (appiumRev) {
      welcome += " (REV " + appiumRev + ")";
    }
    logger.info(welcome);
    var logMessage = "Appium REST http interface listener started on " +
                     args.address + ":" + args.port;
    logger.info(logMessage);
    startAlertSocket(server, appiumServer);
    if (args.nodeconfig !== null) {
      gridRegister.registerNode(args.nodeconfig, args.address, args.port);
    }
    var showArgs = getNonDefaultArgs(parser, args);
    if (_.size(showArgs)) {
      logger.info("Non-default server args: " + JSON.stringify(showArgs));
    }
  });
  server.on('error', function (err) {
    if (err.code === 'EADDRNOTAVAIL') {
      logger.error("Couldn't start Appium REST http interface listener. Requested address is not available.");
    } else {
      logger.error("Couldn't start Appium REST http interface listener. Requested port is already in use. Please make sure there's no other instance of Appium running already.");
    }
    if (!alreadyReturned) {
      alreadyReturned = true;
      cb(err);
    }
  });
  server.on('connection', function (socket) {
    socket.setTimeout(600 * 1000); // 10 minute timeout
  });
  setTimeout(function () {
    if (!alreadyReturned) {
      alreadyReturned = true;
      cb(null);
    }
  }, 1000);
};
