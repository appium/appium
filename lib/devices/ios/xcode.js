"use strict";

var logger = require('../../server/logger.js').get('appium')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec;

var xcode = {};

xcode.getPath = function (cb) {
  exec('xcode-select --print-path', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout, stderr) {
    if (!err) {
      var xcodeFolderPath = stdout.replace("\n", "");
      if (fs.existsSync(xcodeFolderPath)) {
        cb(null, xcodeFolderPath);
      } else {
        logger.error(xcodeFolderPath + "does not exist.");
        cb(new Error("xcode-select could not find xcode"), null);
      }
    } else {
      logger.error("xcode-select threw error " + err);
      logger.error("Stderr: " + stderr);
      logger.error("Stdout: " + stdout);
      cb(new Error("xcode-select threw an error"), null);
    }
  });
};

xcode.getVersion = function (cb) {
  xcode.getPath(function (err, xcodePath) {
    if (err  !== null) {
      cb(err, null);
    } else {
      var xcodebuildPath = path.resolve(xcodePath, "usr/bin/xcodebuild");
      if (!fs.existsSync(xcodebuildPath)) {
        cb(new Error("Could not get Xcode version: " + xcodebuildPath + " does not exist on disk."), null);
      } else {
        exec(JSON.stringify(xcodebuildPath) + ' -version', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout) {
          var versionPattern = /\d\.\d\.*\d*/;
          var match = versionPattern.exec(stdout);
          if (match === null) {
            cb(new Error("Could not parse Xcode version (xcodebuild output was: " + stdout + ")"), null);
          } else {
            var versionNumber = match[0];
            cb(null, versionNumber);
          }
        });
      }
    }
  });
};

xcode.getiOSSDKVersion = function (cb) {
  var msg;
  xcode.getVersion(function (err, versionNumber) {
    if (err) {
      msg = "Could not get the iOS SDK version because the Xcode version could not be determined.";
      logger.error(msg);
      cb(new Error(msg), null);
    } else if (versionNumber[0] === '4') {
      cb(null, '6.1');
    } else {
      exec('xcrun --sdk iphonesimulator --show-sdk-version', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout, stderr) {
        if (!err) {
          var iosSDKVersion = stdout.replace("\n", "");
          var match = /\d.\d/.exec(iosSDKVersion);
          if (match) {
            cb(null, iosSDKVersion);
          } else {
            msg = "xcrun returned a non-numeric iOS SDK version: " + iosSDKVersion;
            logger.error(msg);
            cb(new Error(msg), null);
          }
        } else {
          msg = "xcrun threw an error " + err;
          logger.error(msg);
          logger.error("Stderr: " + stderr);
          logger.error("Stdout: " + stdout);
          cb(new Error(msg), null);
        }
      });
    }
  });
};

module.exports = xcode;
