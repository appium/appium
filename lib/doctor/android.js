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
    exports.IsAndroidHomeExported,
    exports.IsJavaHomeExported
  ], cb);
};

exports.IsAndroidHomeExported = function(cb) {
  var msg;
  if (env.ANDROID_HOME === null) {
    msg = 'ANDROID_HOME is not set';
    log.fail(msg);
    cb(msg, msg);
  } else if (fs.existsSync(env.ANDROID_HOME)) {
    msg = 'ANDROID_HOME is set to "' + env.ANDROID_HOME + '."';
    log.pass(msg);
    cb(null, msg);
  } else {
    msg = 'ANDROID_HOME is set but does not exist on the file system at "' + env.ANDROID_HOME + '"';
    log.fail(msg);
    cb(msg, msg);
  }
};

exports.IsJavaHomeExported = function(cb) {
  var msg;
  if (env.JAVA_HOME === null) {
    log.fail(msg);
    msg = 'JAVA_HOME is not set';
    cb(msg, msg);
  } else if (fs.existsSync(env.JAVA_HOME)) {
    msg = 'JAVA_HOME is set to "' + env.JAVA_HOME + '."';
    log.pass(msg);
    cb(null, msg);
  } else {
    msg = 'JAVA_HOME is set but does not exist on the file system at "' + env.JAVA_HOME + '"';
    log.fail(msg);
    cb(msg, msg);
  }
};