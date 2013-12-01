"use strict";
var path = require('path')
  , fs = require('fs')
  , env = process.env
  , exec = require('child_process').exec
  , common = require("./common.js")
  , async = require('async');

function AndroidChecker(log) {
  this.log = log;
}
exports.AndroidChecker = AndroidChecker;

AndroidChecker.prototype.runAllChecks = function(cb) {
  async.series([
    this.IsAndroidHomeExported.bind(this),
    this.IsJavaHomeExported.bind(this)
  ], cb);
};

AndroidChecker.prototype.IsAndroidHomeExported = function(cb) {
  var msg;
  if (env.ANDROID_HOME === null) {
    msg = 'ANDROID_HOME is not set';
    this.log.fail(msg);
    cb(msg, msg);
  } else if (fs.existsSync(env.ANDROID_HOME)) {
    msg = 'ANDROID_HOME is set to "' + env.ANDROID_HOME + '"';
    this.log.pass(msg);
    cb(null, msg);
  } else {
    msg = 'ANDROID_HOME is set but does not exist on the file system at "' + env.ANDROID_HOME + '"';
    this.log.fail(msg);
    cb(msg, msg);
  }
};

AndroidChecker.prototype.IsJavaHomeExported = function(cb) {
  var msg;
  if (env.JAVA_HOME === null) {
    this.log.fail(msg);
    msg = 'JAVA_HOME is not set';
    cb(msg, msg);
  } else if (fs.existsSync(env.JAVA_HOME)) {
    msg = 'JAVA_HOME is set to "' + env.JAVA_HOME + '."';
    this.log.pass(msg);
    cb(null, msg);
  } else {
    msg = 'JAVA_HOME is set but does not exist on the file system at "' + env.JAVA_HOME + '"';
    this.log.fail(msg);
    cb(msg, msg);
  }
};