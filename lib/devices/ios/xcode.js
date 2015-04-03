"use strict";

var logger = require('../../server/logger.js').get('appium')
  , fs = require('fs')
  , async = require('async')
  , exec = require('child_process').exec
  , util = require('appium-support').util
  , env = process.env
  , helpers = require('../../helpers.js')
  , escapeSpace = helpers.escapeSpace;

var XCODE_SUBDIR = "/Contents/Developer";
var xcode = {};

var _hasExpectedSubDir = function (path) {
  return path.substring(path.length - XCODE_SUBDIR.length) === XCODE_SUBDIR;
};

var _getPathFromSymlink = function (stdout, cb) {
  // Node's invocation of xcode-select sometimes flakes and returns an empty string.
  // Not clear why. As a workaround, Appium can reliably deduce the version in use by checking
  // the locations xcode-select uses to store the selected version's path. This should be 100%
  // reliable so long as the link locations remain the same. However, since we're relying on
  // hardcoded paths, this approach will break the next time Apple changes the symlink location.
  var symlnkPath = "/var/db/xcode_select_link";
  var legacySymlnkPath = "/usr/share/xcode-select/xcode_dir_path"; //  Xcode < 5.x (?)

  // xcode-select allows users to override its settings with the DEVELOPER_DIR env var,
  // so check that first
  if (util.hasContent(env.DEVELOPER_DIR)) {
    var dir = _hasExpectedSubDir(env.DEVELOPER_DIR) ?
                env.DEVELOPER_DIR :
                env.DEVELOPER_DIR + XCODE_SUBDIR;
    cb(null, dir);
  } else if (fs.existsSync(symlnkPath)) {
    fs.readlink(symlnkPath, cb);
  } else if (fs.existsSync(legacySymlnkPath)) {
    fs.readlink(legacySymlnkPath, cb);
  } else {
    // We should only get here is we failed to capture xcode-select's stdout and our
    // other checks failed. Either Apple has moved the symlink to a new location or the user
    // is using the default install. 99.999% chance it's the latter, so issue a warning
    // should we ever hit the edge case.
    logger.warn("xcode-select returned an invalid path: " + stdout +
                ". No links to alternate versions were detected. Using Xcode's " +
                "default location.");
    var path = "/Applications/Xcode.app" + XCODE_SUBDIR;
    var err = fs.existsSync(path) ? null : new Error("No Xcode installation found.");
    cb(err, path);
  }
};

xcode.getPath = function (cb) {
  exec('xcode-select --print-path', { maxBuffer: 524288, timeout: 3000 }, function (err, stdout, stderr) {
    if (!err) {
      var xcodeFolderPath = stdout.replace("\n", "");
      xcodeFolderPath = xcodeFolderPath.replace(new RegExp("/$"), "");

      if (util.hasContent(xcodeFolderPath) && fs.existsSync(xcodeFolderPath)) {
        cb(null, xcodeFolderPath);
      } else if (!util.hasContent(xcodeFolderPath)) {
        _getPathFromSymlink(xcodeFolderPath, cb);
      } else {
        var msg = "xcode-select could not find xcode. Path: " + xcodeFolderPath + " does not exist.";
        logger.error(msg);
        cb(new Error(msg), null);
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
    if (!err && !_hasExpectedSubDir(xcodePath)) {
      err = new Error("Expected a path ending with '" + XCODE_SUBDIR + "', but got " + xcodePath);
    }
    if (err) {
      return cb(err, null);
    }
    // we want to read the CFBundleShortVersionString from Xcode's plist.
    // It should be in /[root]/XCode.app/Contents/
    var plistPath = xcodePath.replace(XCODE_SUBDIR, "/Contents/Info.plist");
    if (!fs.existsSync(plistPath)) {
      return cb(new Error("Could not get Xcode version: " + plistPath + " does not exist on disk."), null);
    } else {
      try {
        var cmd = "/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' " + 
                  escapeSpace(plistPath);
      } catch(e) {
        return cb(e);
      }
      exec(cmd, { maxBuffer: 524288, timeout: 3000 }, function (err, stdout) {
        if (err !== null) return cb(err, null);
        var versionPattern = /\d\.\d\.*\d*/;
        // need to use string#match here; previous code used regexp#exec, which does not return null
        var match = stdout.match(versionPattern);
        if (match === null || !util.hasContent(match[0])) {
          cb(new Error("Could not parse Xcode version (xcodebuild output was: " + stdout + ")."), null);
        } else {
          var versionNumber = match[0];
          cb(null, versionNumber);
        }
      });
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
      logger.debug("Getting sdk version from xcrun with a timeout");
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

xcode.getiOSSDKVersionWithRetry = function (times, cb) {
  async.retry(times, xcode.getiOSSDKVersion, cb);
};

module.exports = xcode;
