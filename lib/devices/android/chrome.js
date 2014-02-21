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
  this.chromedriverStarted = false;
  this.adb = null;
  this.onDie = function () {};
  this.exitCb = null;
  this.shuttingDown = false;
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype.start = function (cb, onDie) {
  this.adb = new ADB(this.opts);
  this.onDie = onDie;
  this.onChromedriverStart = null;
  this.chromedriver = new Chromedriver({
    proxyPort: this.opts.proxyPort
  });
  this.proxyTo = this.chromedriver.proxyTo;
  async.waterfall([
    this.ensureChromedriverExists.bind(this), // TODO chromedriver
    this.unlock.bind(this),
    this.killOldChromedrivers.bind(this), // TODO chromedriver
    this.startChromedriver.bind(this), // TODO chromedriver
    this.createSession.bind(this) // TODO chromedriver
  ], cb);
};

ChromeAndroid.prototype.unlock = function (cb) {
  this.pushUnlock(function (err) {
    if (err) return cb(err);
    this.unlockScreen(cb);
  }.bind(this));
};

ChromeAndroid.prototype.createSession = function (cb) {
  logger.info("Creating Chrome session");
  var caps = {
    chromeOptions: {
      androidPackage: this.opts.appPackage,
      androidActivity: this.opts.appActivity
    }
  };
  if (this.opts.appPackage === "com.android.chrome") {
    delete caps.chromeOptions.androidActivity;
  }
  this.chromedriver.createSession(caps, cb);
};

ChromeAndroid.prototype.deleteSession = function (cb) {
  logger.info("Deleting Chrome session");
  this.chromedriver.deleteSession(cb);
};

ChromeAndroid.prototype.stop = function (cb) {
  logger.info('Killing chromedriver');
  this.exitCb = cb;
  this.proc.kill();
};


module.exports = ChromeAndroid;
