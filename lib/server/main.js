"use strict";
var parser = require('./parser.js')()
  , logFactory = require('./logger.js')
  , logger = null
  , args = null
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore');

process.chdir(path.resolve(__dirname, '../..'));

if (require.main === module) {
  args = parser.parseArgs();
  logFactory.init(args);
}

logger = logFactory.get('appium');

var appiumPermStat = fs.statSync(path.resolve(__dirname, '../../package.json'));

if (
  (!_(process.env.SUDO_UID).isUndefined() || appiumPermStat.uid !== process.getuid()) &&
  !(process.env.SUDO_COMMAND || "").match(/grunt authorize/)
) {
  logger.error("Appium will not work if used or installed with sudo. " +
               "Please rerun/install as a non-root user. If you had to install " +
               "Appium using `sudo npm install -g appium`, the solution " +
               "is to reinstall Node using a method (Homebrew, for example) " +
               "that doesn't require sudo to install global npm packages.");
  process.exit(1);
}

var http = require('http')
  , express = require('express')
  , path = require('path')
  , appium = require('../appium.js')
  , parserWrap = require('./middleware').parserWrap
  , appiumVer = require('../../package.json').version
  , appiumRev = null
  , async = require('async')
  , helpers = require('./helpers.js')
  , logFinalWarning = require('../helpers.js').logFinalDeprecationWarning
  , getConfig = require('../helpers.js').getAppiumConfig
  , allowCrossDomain = helpers.allowCrossDomain
  , catchAllHandler = helpers.catchAllHandler
  , checkArgs = helpers.checkArgs
  , winstonStream = helpers.winstonStream
  , configureServer = helpers.configureServer
  , startListening = helpers.startListening
  , conditionallyPreLaunch = helpers.conditionallyPreLaunch
  , noColorLogger = helpers.noColorLogger;

var main = function (args, readyCb, doneCb) {

  if (args.showConfig) {
    try {
      console.log(JSON.stringify(getConfig()));
    } catch (e) {
      process.exit(1);
    }
    process.exit(0);
  }

  checkArgs(args);
  if (typeof doneCb === "undefined") {
    doneCb = function () {};
  }

  var rest = express()
    , server = http.createServer(rest);

  rest.configure(function () {
    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, 'static')));
    rest.use(allowCrossDomain);
    if (!args.quiet) {
      if (args.logNoColors) {
        rest.use(express.logger(noColorLogger));
      } else {
        rest.use(express.logger('dev'));
      }
    }
    if (args.log || args.webhook) {
      rest.use(express.logger({stream: winstonStream}));
    }
    rest.use(parserWrap);
    rest.use(express.urlencoded());
    rest.use(express.json());
    rest.use(express.methodOverride());
    rest.use(rest.router);
    rest.use(catchAllHandler);
  });

  // Instantiate the appium instance
  var appiumServer = appium(args);

  // Hook up REST http interface
  appiumServer.attachTo(rest);


  async.series([
    function (cb) {
      configureServer(getConfig(), appiumVer, appiumServer, function (err, rev) {
        if (err) return cb(err);
        appiumRev = rev;
        cb();
      });
    },
    function (cb) {
      conditionallyPreLaunch(args, appiumServer, cb);
    },
    function (cb) {
      startListening(server, args, parser, appiumVer, appiumRev, appiumServer, cb);
    }
  ], function (err) {
    if (err) {
      process.exit(1);
    } else if (typeof readyCb === "function") {
      readyCb(appiumServer);
    }
  });

  server.on('close', function () {
    logFinalWarning();
    doneCb();
  });

};

if (require.main === module) {
  main(args);
}

module.exports.run = main;
