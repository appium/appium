"use strict";

var errors = require('./errors')
  , adb = require('../uiautomator/adb')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , status = require("./uiauto/lib/status")
  , exec = require('child_process').exec
  , fs = require('fs')
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError;

var Selendroid = function(opts) {
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.verbose = opts.verbose;
  this.onStop = function() {};
  this.adb = null;
  this.isProxy = true;
};

Selendroid.prototype.start = function(cb) {
  console.log("starting selendroid");
  cb(null);
};

module.exports = function(opts) {
  return new Selendroid(opts);
};

