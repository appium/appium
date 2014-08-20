"use strict";

var _ = require("underscore")
  , gridRegister = require('./grid-register.js')
  , logger = require('./logger.js').get('appium')
  , status = require('./status.js')
  , io = require('socket.io')
  , mkdirp = require('mkdirp')
  , bytes = require('bytes')
  , domain = require('domain')
  , format = require('util').format
  , Args = require("vargs").Constructor;

module.exports.allowCrossDomain = function (req, res, next) {
  safely(req, function () {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS,DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type, accept');
  });

  // need to respond 200 to OPTIONS

  if ('OPTIONS' === req.method) {
    safely(req, function () {
      res.send(200);
    });
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
  safely(req, function () {
    res.send(500, {
      status: status.codes.UnknownError.code
    , value: "ERROR running Appium command: " + e.message
    });
  });
  next(e);
};

module.exports.checkArgs = function (parser, args) {
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

  var checkValidPort = function (port) {
    if (port > 0 && port < 65536) return true;
    console.error("Port must be greater than 0 and less than 65536");
    return false;
  };

  var validations = {
    port: checkValidPort
  , callbackPort: checkValidPort
  , bootstrapPort: checkValidPort
  , selendroidPort: checkValidPort
  , chromedriverPort: checkValidPort
  , robotPort: checkValidPort
  , backendRetries: function (r) { return r >= 0; }
  };

  var nonDefaultArgs = getNonDefaultArgs(parser, args);

  _.each(validations, function (validator, arg) {
    if (_.has(nonDefaultArgs, arg)) {
      if (!validator(args[arg])) {
        console.error("Invalid argument for param " + arg + ": " + args[arg]);
        process.exit(1);
      }
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

var getDeprecatedArgs = function (parser) {
  var deprecated = {};
  _.each(parser.rawArgs, function (rawArg) {
    if (rawArg[1].deprecatedFor) {
      deprecated[rawArg[0]] = "use instead: " + rawArg[1].deprecatedFor;
    }
  });
  return deprecated;
};

module.exports.startListening = function (server, args, parser, appiumVer, appiumRev, appiumServer, cb) {
  var alreadyReturned = false;
  server.listen(args.port, args.address, function () {
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
      logger.debug("Non-default server args: " + JSON.stringify(showArgs));
    }
    var deprecatedArgs = getDeprecatedArgs(parser);
    if (_.size(deprecatedArgs)) {
      logger.warn("Deprecated server args: " + JSON.stringify(deprecatedArgs));
    }
    logger.info('LogLevel:', logger.appiumLoglevel);
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

// Copied the morgan compile function over so that cooler formats
// may be configured
function compile(fmt) {
  fmt = fmt.replace(/"/g, '\\"');
  var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g,
    function (_, name, arg) {
      return '"\n    + (tokens["' + name + '"](req, res, "' + arg + '") || "-") + "';
    }) + '";';
  // jshint evil:true
  return new Function('tokens, req, res', js);
}
module.exports.requestStartLoggingFormat = compile('-->'.white + ' ' + ':method'.white + ' ' +
  ':url'.white);
// Copied the morgan format.dev function, modified to use colors package
// and custom logging line
module.exports.requestEndLoggingFormat = function (tokens, req, res) {
  var status = res.statusCode;
  var statusStr = ':status';
  if (status >= 500) statusStr = statusStr.red;
  else if (status >= 400) statusStr = statusStr.yellow;
  else if (status >= 300) statusStr = statusStr.cyan;
  else statusStr = statusStr.green;
  var fn = compile('<-- :method :url '.white + statusStr +
    ' :response-time ms - :res[content-length]'.grey);
  return fn(tokens, req, res);
};

function getRequestContext(req) {
  if (!req) return '';
  var data = '';
  try {
    if (req.body) data = JSON.stringify(req.body).substring(0, 200);
  } catch (ign) {}
  return format('context: [%s %s %s]', req.method, req.url, data).replace(/ ]$/, '');
}

// Mainly used to wrap http response methods, or for cases where errors
// perdure the domain
var safely = function () {
  var args = new(Args)(arguments);
  var req = args.all[0];
  var fn = args.callback;
  try {
    fn();
  } catch (err) {
    logger.error('Unexpected error:', err.stack, getRequestContext(req));
  }
};
module.exports.safely = safely;

module.exports.domainMiddleware = function () {
  return function (req, res, next) {
    var reqDomain = domain.create();
    reqDomain.add(req);
    reqDomain.add(res);
    res.on('close', function () {
      setTimeout(function () {
        reqDomain.dispose();
      }, 5000);
    });
    reqDomain.on('error', function (err) {
      logger.error('Unhandled error:', err.stack, getRequestContext(req));
    });
    reqDomain.run(next);
  };
};
