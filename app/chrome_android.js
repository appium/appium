"use strict";

var Android = require('./android').Android
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , deviceCommon = require('./device')
  , rdp = require('./hybrid/rdp.js')
  , status = require("./uiauto/lib/status");

var ChromeAndroid = function(opts) {
  this.initialize(opts);
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype._start = ChromeAndroid.prototype.start;

ChromeAndroid.prototype.loadFirstWebview = function(cb) {
  var me = this;
  this.remote = rdp(function() {
    // TODO: fill out with what to do if webview disconnects on us
  });
  this.remote.pageArrayFromJson(function(pageArray) {
    me.curWindowHandle = pageArray[0].id;
    me.remote.connect(me.curWindowHandle, cb);
  });
};

ChromeAndroid.prototype.start = function(cb, onDie) {
  var me = this;
  this._start(function(err) {
    if (err) return cb(err);
    me.loadFirstWebview(function() {
      cb();
    });
  }, onDie);
};

module.exports = function(opts) {
  return new ChromeAndroid(opts);
};
