"use strict";

var Android = require('./android.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , async = require('async')
  , ADB = require('./adb.js')
  , Chromedriver = require('./chromedriver.js');

var ChromeAndroid = function (opts) {
  this.initialize(opts);
  this.avoidProxy = [];
  this.opts = opts;
  this.isProxy = true;
  this.adb = null;
  this.onDie = null;
};

_.extend(ChromeAndroid.prototype, Android.prototype);

ChromeAndroid.prototype.configure = function (args, caps, cb) {
  logger.info("Looks like we want chrome on android");
  this.setArgsAndCaps(args, caps);
  if (args.app.toLowerCase() === "chromium") {
    this.args.androidPackage = "org.chromium.chrome.testshell";
    this.args.androidActivity = "org.chromium.chrome.testshell.Main";
  } else if (args.app.toLowerCase() === "browser") {
    this.args.androidPackage = "com.android.browser";
    this.args.androidActivity = "com.android.browser.BrowserActivity";
  } else {
    this.args.androidPackage = "com.android.chrome";
    this.args.androidActivity = "com.google.android.apps.chrome.Main";
  }
  this.args.app = null;
  cb();
};

ChromeAndroid.prototype.start = function (cb, onDie) {
  this.adb = new ADB(this.opts);
  this.onDie = onDie;

  async.waterfall([
    this.prepareActiveDevice.bind(this),
    this.prepareChromedriver.bind(this),
    this.unlock.bind(this),
    this.createSession.bind(this)
  ], cb);
};

ChromeAndroid.prototype.prepareChromedriver = function (cb) {
  this.chromedriver = new Chromedriver(this.opts.proxyPort,
      this.adb.curDeviceId, this.onChromedriverExit.bind(this));
  this.proxyTo = this.chromedriver.proxyTo.bind(this.chromedriver);
  this.proxyHost = this.chromedriver.proxyHost;
  this.proxyPort = this.chromedriver.proxyPort;
  this.deleteSession = this.chromedriver.deleteSession.bind(this.chromedriver);
  cb();
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
