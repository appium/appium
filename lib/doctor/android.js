"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , isWindows = require("../helpers.js").isWindows()
  , async = require('async');

require("./common.js");

function AndroidChecker(log) {
  this.log = log;
}
exports.AndroidChecker = AndroidChecker;

AndroidChecker.prototype.runAllChecks = function (cb) {
  async.series([
    this.checkAndroidHomeExported.bind(this),
    this.checkJavaHomeExported.bind(this),
    this.checkADBExists.bind(this),
    this.checkAndroidExists.bind(this),
    this.checkEmulatorExists.bind(this)
  ], cb);
};

AndroidChecker.prototype.checkAndroidHomeExported = function (cb) {
  if (env.ANDROID_HOME === null) {
    this.log.fail('ANDROID_HOME is not set', cb);
  } else if (fs.existsSync(env.ANDROID_HOME)) {
    this.log.pass('ANDROID_HOME is set to "' + env.ANDROID_HOME + '"', cb);
  } else {
    this.log.fail('ANDROID_HOME is set but does not exist on the file system at "' + env.ANDROID_HOME + '"', cb);
  }
};

AndroidChecker.prototype.checkJavaHomeExported = function (cb) {
  if (env.JAVA_HOME === null) {
    this.log.fail('JAVA_HOME is not set', cb);
  } else if (fs.existsSync(env.JAVA_HOME)) {
    this.log.pass('JAVA_HOME is set to "' + env.JAVA_HOME + '."', cb);
  } else {
    this.log.fail('JAVA_HOME is set but does not exist on the file system at "' + env.JAVA_HOME + '"', cb);
  }
};

AndroidChecker.prototype.checkADBExists = function (cb) {
  this.checkAndroidSDKBinaryExists("ADB", path.join("platform-tools", (isWindows ? 'adb.exe' : 'adb')), cb);
};

AndroidChecker.prototype.checkAndroidExists = function (cb) {
  this.checkAndroidSDKBinaryExists("Android", path.join("tools", (isWindows ? 'android.bat' : 'android')), cb);
};

AndroidChecker.prototype.checkEmulatorExists = function (cb) {
  this.checkAndroidSDKBinaryExists("Emulator", path.join("tools", (isWindows ? 'emulator.exe' : 'emulator')), cb);
};

AndroidChecker.prototype.checkAndroidSDKBinaryExists = function (toolName, relativeToolPath, cb) {
  if (env.ANDROID_HOME !== null) {
    var adbPath = path.resolve(env.ANDROID_HOME, relativeToolPath);
    if (fs.existsSync(adbPath)) {
      this.log.pass(toolName + " exists at " + adbPath, cb);
    } else {
      this.log.fail(toolName + " could not be found at " + adbPath, cb);
    }
  } else {
    this.log.fail(toolName + " could not be found because ANDROID_HOME is not set.", cb);
  }
};