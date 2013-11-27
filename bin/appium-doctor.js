#!/usr/bin/env node
"use strict";
var ios = require('../lib/doctor/ios.js')
  , android = require('../lib/doctor/android.js')
  , common = require("../lib/doctor/common.js")
  , log = require('../lib/doctor/common.js').log
  , eol = require('os').EOL
  , async = require('async');

var argv = process.argv
  , doAndroid = argv.indexOf('--android') > -1
  , doIOS = argv.indexOf('--ios') > -1
  , verbose = argv.indexOf('--verbose') > -1;

if (!doIOS && !doAndroid) {
  doIOS = true;
  doAndroid = true;
}

var runiOSChecks = function(cb) {
  if (doIOS) {
    log.comment("Running iOS Checks");
    ios.runAllChecks(function(err) {
      if (!err) {
        log.pass("iOS Checks were successful." + eol);
        cb();
      } else {
        common.exitDoctor();
      }
    });
  }
};

var runAndroidChecks = function(cb) {
  if (doAndroid) {
    log.comment("Running Android Checks");
    android.runAllChecks(function(err) {
      if (!err) {
        log.pass("Android Checks were successful." + eol);
        cb();
      } else {
        common.exitDoctor();
      }
    });
  }
};

if (require.main === module) {
  async.series([
    runiOSChecks,
    runAndroidChecks
  ], function(err) {
    if (!err) {
      log.pass("All Checks were successful");
    } else {
      common.exitDoctor();
    }
  });
}
