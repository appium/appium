"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , exec = require('child_process').exec
  , common = require("./common.js")
  , log = require('./common.js').log
  , async = require('async');

exports.runAllChecks = function(cb) {
  async.series([
    exports.checkForXcode,
    exports.checkForXcodeCommandLineTools
  ], cb);
};

exports.checkForXcode = function(cb) {
  var msg;
  exec("xcode-select -p", { maxBuffer: 524288}, function(err, stdout) {
    if (err === null) {
      var xcodePath = stdout.replace("\n","");
      if(fs.existsSync(xcodePath)) {
        msg = "Xcode is installed at " + xcodePath;
        log.pass(msg);
        cb(null, msg);
      } else {
        msg = "Xcode is not installed.";
        log.fail(msg);
        common.promptYesOrNo("Fix it?", function() {
          exports.installXcode(cb);
        }, function() {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode is not installed: " + err;
      log.fail(msg);
      common.promptYesOrNo("Fix it?", function() {
        exports.installXcode(cb);
      }, function() {
        cb(msg, msg);
      });
    }
  });
};

exports.checkForXcodeCommandLineTools = function(cb) {
  var msg;
  exec("pkgutil --pkg-info=com.apple.pkg.CLTools_Executables", { maxBuffer: 524288}, function(err, stdout) {
    if (err === null) {
      var match = stdout.match(/install-time/);
      if (match !== null) {
        msg = "Xcode Command Line Tools are installed.";
        cb(null, msg);
      } else {
        msg = "Xcode Command Line Tools are NOT installed.";
        log.fail(msg);
        common.promptYesOrNo("Fix it?", function() {
          exports.installXcodeCommandLineTools(cb);
        }, function() {
          cb(msg, msg);
        });
      }
    } else {
      msg = "Xcode Command Line Tools are NOT installed: " + err;
      log.fail(msg);
      common.promptYesOrNo("Fix it?", function() {
        exports.installXcodeCommandLineTools(cb);
      }, function() {
        cb(msg, msg);
      });
    }
  });
};

exports.installXcode = function(cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function() {
    common.promptForAnyKey(function() {
      exports.checkForXcode(cb);
    });
  });
};

exports.installXcodeCommandLineTools = function(cb) {
  exec("xcode-select --install", { maxBuffer: 524288}, function() {
    common.promptForAnyKey(function() {
      exports.checkForXcodeCommandLineTools(cb);
    });
  });
};
