#!/usr/bin/env node
"use strict";
var IOSChecker = require('../lib/doctor/ios.js').IOSChecker
  , AndroidChecker = require('../lib/doctor/android.js').AndroidChecker
  , DevChecker = require('../lib/doctor/dev.js').DevChecker
  , common = require("../lib/doctor/common.js")
  , eol = require('os').EOL
  , async = require('async')
  , isMac = process.platform === 'darwin'
  , isWindows = process.platform === 'win32';

var argv = process.argv
  , doAndroid = argv.indexOf('--android') > -1
  , doIOS = argv.indexOf('--ios') > -1
  , doDev = argv.indexOf('--dev') > -1
  , verbose = argv.indexOf('--verbose') > -1
  , broadcast = argv.indexOf('--port') > -1
  , port = null;

if (broadcast) {
  port = argv[argv.indexOf("--port") + 1];
}

if (!doIOS && !doAndroid) {
  doIOS = isMac;
  doAndroid = true;
}

var log = new common.Log(port);

var runiOSChecks = function(cb) {
  if (doIOS) {
    if (!isMac) {
      log.fail("iOS Checks cannot be run on Windows.");
      log.exitDoctor();
    }
    var iosChecker = new IOSChecker(log);
    log.comment("Running iOS Checks");
    iosChecker.runAllChecks(function(err) {
      if (!err) {
        log.pass("iOS Checks were successful." + eol);
        cb();
      } else {
        log.exitDoctor();
      }
    });
  } else {
    cb();
  }
};

var runAndroidChecks = function(cb) {
  if (doAndroid) {
    var androidChecker = new AndroidChecker(log);
    log.comment("Running Android Checks");
    androidChecker.runAllChecks(function(err) {
      if (!err) {
        log.pass("Android Checks were successful." + eol);
        cb();
      } else {
        log.exitDoctor();
      }
    });
  } else {
    cb();
  }
};

var runDevChecks = function(cb) {
  if (doDev) {
    var devChecker = new DevChecker(log);
    log.comment("Running Dev Checks");
    devChecker.runAllChecks(function(err) {
      if (!err) {
        log.pass("Dev Checks were successful." + eol);
        cb();
      } else {
        log.exitDoctor();
      }
    });
  } else {
    cb();
  }
};

if (require.main === module) {

  var mainMethod = function() {
    async.series([
      runiOSChecks,
      runAndroidChecks,
      runDevChecks
    ], function(err) {
      if (!err) {
        log.pass("All Checks were successful");
        log.stopBroadcast();
      } else {
        log.exitDoctor();
      }
    });
  };

  if (log.broadcast) {
    log.startBroadcast(mainMethod);
  } else {
    mainMethod();
  }
}
