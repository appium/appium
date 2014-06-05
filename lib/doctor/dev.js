"use strict";
var  fs = require('fs')
  , exec = require('child_process').exec
  , isWindows = require("../helpers.js").isWindows()
  , eol = require('os').EOL
  , async = require('async')
  , path = require('path')
  , env = process.env;

require("./common.js");

function DevChecker(log) {
  this.log = log;
}
exports.DevChecker = DevChecker;

DevChecker.prototype.runAllChecks = function (cb) {
  async.series([
      this.checkMavenExistsInPath.bind(this)
    , this.checkADBExistsInPath.bind(this)
    , this.checkANTExistsInPath.bind(this)
    , this.checkAndroidSDK16Exists.bind(this)
    , this.checkAndroidSDK18Exists.bind(this)
  ], cb);
};

DevChecker.prototype.checkMavenExistsInPath = function (cb) {
  this.checkBinaryExistsInPath(isWindows ? "mvn.bat" : "mvn", cb);
};

DevChecker.prototype.checkADBExistsInPath = function (cb) {
  this.checkBinaryExistsInPath(isWindows ? "adb.exe" : "adb", cb);
};

DevChecker.prototype.checkANTExistsInPath = function (cb) {
  this.checkBinaryExistsInPath(isWindows ? "ant.bat" : "ant", cb);
};

DevChecker.prototype.checkAndroidSDK16Exists = function (cb) {
  this.checkAndroidSDKExists("android-16", cb);
};

DevChecker.prototype.checkAndroidSDK18Exists = function (cb) {
  this.checkAndroidSDKExists("android-18", cb);
};

DevChecker.prototype.checkBinaryExistsInPath = function (binaryName,cb) {
  exec(isWindows ? "where " + binaryName : "which " + binaryName, { maxBuffer: 524288 }, function (err, stdout) {
    if (!err) {
      var binaryPath = isWindows ? stdout.split(eol)[0] : stdout.replace(eol, "");
      if (fs.existsSync(binaryPath)) {
        this.log.pass(binaryName + " was found at " + binaryPath, cb);
      } else {
        this.log.fail(binaryName + " does not exist in path.Please add to the system path", cb);
      }
    } else {
      this.log.fail("Could not find " + binaryName + " in path.Please add it to system path", cb);
    }
  }.bind(this));
};

DevChecker.prototype.checkAndroidSDKExists = function (sdk,cb) {
  if (typeof env.ANDROID_HOME !== "undefined") {
    var sdkPath = path.resolve(env.ANDROID_HOME, path.join("platforms", sdk));
    if (fs.existsSync(sdkPath)) {
      this.log.pass(sdk + " exists at " + sdkPath, cb);
    } else {
      this.log.fail(sdk + " could not be found at " + sdkPath, cb);
    }
  } else {
    this.log.fail(sdk + " could not be found because ANDROID_HOME is not set.", cb);
  }
};
