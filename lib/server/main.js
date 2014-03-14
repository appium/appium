"use strict";
var parser = require('./parser.js')
  , logFactory = require('./logger.js')
  , logger = null
  , args = null;

if (require.main === module) {
  args = parser().parseArgs();
  logFactory.init(args);
}

logger = logFactory.get('appium');

var http = require('http')
  , express = require('express')
  , path = require('path')
  , fs = require('fs')
  , appium = require('../appium.js')
  , parserWrap = require('./middleware').parserWrap
  , appiumVer = require('../../package.json').version
  , appiumRev = null
  , async = require('async')
  , helpers = require('./helpers.js')
  , logDeprecationWarnings = require('../helpers.js').logDeprecationWarnings
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
  var wrappedDoneCb = function () {
    logDeprecationWarnings();
    doneCb();
  };
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
      startListening(server, args, appiumVer, appiumRev, appiumServer, cb);
    }
  ], function (err) {
    if (err) {
      process.exit(1);
    } else if (typeof readyCb === "function") {
      readyCb(appiumServer);
    }
  });

  server.on('close', wrappedDoneCb);
  return server;
};

if (require.main === module) {
  main(args);
}

module.exports.run = main;
