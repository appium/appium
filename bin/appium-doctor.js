#!/usr/bin/env node
"use strict";
var ios = require('../lib/doctor/ios.js')
  , android = require('../lib/doctor/android.js')
  , common = require("../lib/doctor/common.js")
  , eol = require('os').EOL
  , async = require('async');

var argv = process.argv
  , doAndroid = argv.indexOf('--android') > -1
  , doIOS = argv.indexOf('--ios') > -1
  , verbose = argv.indexOf('--verbose') > -1
  , broadcast = argv.indexOf('--port') > -1
  , port = null;

if (broadcast) {
  port = argv[argv.indexOf("--port") + 1];
}

if (!doIOS && !doAndroid) {
  doIOS = true;
  doAndroid = true;
}

var log = new common.Log(port);

var runiOSChecks = function(cb) {
  if (doIOS) {
    var iosChecker = new ios.IOSChecker(log);
    log.comment("Running iOS Checks");
    iosChecker.runAllChecks(function(err) {
      if (!err) {
        log.pass("iOS Checks were successful." + eol);
        cb();
      } else {
        log.exitDoctor();
      }
    });
  }
};

var runAndroidChecks = function(cb) {
  if (doAndroid) {
    var androidChecker = new android.AndroidChecker(log);
    log.comment("Running Android Checks");
    androidChecker.runAllChecks(function(err) {
      if (!err) {
        log.pass("Android Checks were successful." + eol);
        cb();
      } else {
        log.exitDoctor();
      }
    });
  }
};

if (require.main === module) {

  var mainMethod = function() {
    async.series([
      runiOSChecks,
      runAndroidChecks
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
