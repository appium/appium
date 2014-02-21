"use strict";

var Android = require('./android.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , async = require('async')
  , ADB = require('./adb.js')
  , Chromedriver = require('./chromedriver.js');

var ChromeAndroid = function (opts) {
  this.initialize(opts);
  this.opts = opts;
  this.isProxy = true;
  this.adb = null;
  this.onDie = null;
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype.start = function (cb, onDie) {
  this.adb = new ADB(this.opts);
  this.onDie = onDie;
  this.chromedriver = new Chromedriver({
    proxyPort: this.opts.proxyPort
  }, this.onChromedriverExit.bind(this));
  this.proxyTo = this.chromedriver.proxyTo.bind(this.chromedriver);
  this.proxyHost = this.chromedriver.proxyHost;
  this.proxyPort = this.chromedriver.proxyPort;
  this.deleteSession = this.chromedriver.deleteSession.bind(this.chromedriver);
  async.waterfall([
    this.unlock.bind(this),
    this.createSession.bind(this)
  ], cb);
};

ChromeAndroid.prototype.unlock = function (cb) {
  this.pushUnlock(function (err) {
    if (err) return cb(err);
    this.unlockScreen(cb);
  }.bind(this));
};

ChromeAndroid.prototype.createSession = function (cb) {
  var caps = {
    chromeOptions: {
      androidPackage: this.opts.appPackage,
      androidActivity: this.opts.appActivity
    }
  };
  var knownPackages = ["org.chromium.chrome.testshell", "com.android.chrome"];
  if (_.contains(knownPackages, this.opts.appPackage)) {
    delete caps.chromeOptions.androidActivity;
  }
  this.chromedriver.createSession(caps, cb);
};

ChromeAndroid.prototype.stop = function (cb) {
  this.chromedriver.stop(function (err) {
    if (err) return cb(err);
    this.adb.forceStop(this.appPackage, cb);
  }.bind(this));
};

ChromeAndroid.prototype.onChromedriverExit = function () {
  async.series([
    this.adb.getConnectedDevices.bind(this.adb),
    _.partial(this.adb.forceStop.bind(this.adb), this.appPackage)
  ], function (err) {
    if (err) logger.error(err.message);
    this.onDie();
  }.bind(this));
};

module.exports = ChromeAndroid;
