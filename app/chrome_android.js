"use strict";

var Android = require('./android').Android
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , deviceCommon = require('./device')
  , rdp = require('./hybrid/rdp.js')
  , exec = require('child_process').exec
  , status = require("./uiauto/lib/status");

var ChromeAndroid = function(opts) {
  this.initialize(opts);
  this.systemDebuggerPort = 2773;
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype._start = ChromeAndroid.prototype.start;

ChromeAndroid.prototype.loadFirstWebview = function(cb) {
  var me = this;
  this.remote = rdp.init(function() {
    // TODO: fill out with what to do if webview disconnects on us
  });
  this.remote.port = this.systemDebuggerPort;
  this.remote.pageArrayFromJson(function(pageArray) {
    me.curWindowHandle = pageArray[0].id;
    me.remote.connect(me.curWindowHandle, cb);
  });
};

ChromeAndroid.prototype.start = function(cb, onDie) {
  var me = this;
  this._start(function(err) {
    if (err) return cb(err);
    me.forwardDebuggerPort(function(err) {
      if (err) return cb(err);
      me.loadFirstWebview(function() {
        cb();
      });
    });
  }, onDie);
};

ChromeAndroid.prototype.startAppium = function(onLaunch, onExit) {
  this.adb.startChrome(onLaunch, onExit);
};

ChromeAndroid.prototype.shutdown = function() {
  this.remote.disconnect();
  this.onStop();
};

ChromeAndroid.prototype.forwardDebuggerPort = function(cb) {
  logger.info("Forwarding debugger port");
  var arg = "tcp:" + this.systemDebuggerPort +
            " localabstract:chrome_devtools_remote";
  exec(this.adb.adbCmd + " forward " + arg, _.bind(function(err) {
    if (err) {
      logger.error(err); return cb(err);
    }
    cb(null);
  }, this));
};

module.exports = function(opts) {
  return new ChromeAndroid(opts);
};
