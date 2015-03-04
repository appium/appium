"use strict";

var Android = require('./android.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , status = require('../../server/status.js')
  , deviceCommon = require('../common.js')
  , jwpSuccess = deviceCommon.jwpSuccess
  , async = require('async')
  , Chromedriver = require('./chromedriver.js');

var NATIVE_WIN = "NATIVE_APP";
var WEBVIEW_WIN = "WEBVIEW";
var WEBVIEW_BASE = WEBVIEW_WIN + "_";

var ChromeAndroid = function () {
  this.init();
};

_.extend(ChromeAndroid.prototype, Android.prototype);
ChromeAndroid.prototype._androidInit = Android.prototype.init;
ChromeAndroid.prototype.init = function () {
  this._androidInit();
  this.adb = null;
  this.onDie = null;
  this.setChromedriverMode();
};

ChromeAndroid.prototype.setChromedriverMode = function () {
  logger.info("Set mode: Proxying straight through to Chromedriver");
  this.isProxy = true;
  // when proxying to chromedriver, we need to make sure the context endpoints
  // are trapped by appium for its own purposes
  this.avoidProxy = [
    ['POST', new RegExp('^/wd/hub/session/[^/]+/context')],
    ['GET', new RegExp('^/wd/hub/session/[^/]+/context')],
    ['POST', new RegExp('^/wd/hub/session/[^/]+/touch/perform')],
    ['POST', new RegExp('^/wd/hub/session/[^/]+/touch/multi/perform')]
  ];
};

ChromeAndroid.prototype.setNativeMode = function () {
  logger.info("Set mode: Proxying to Appium Bootstrap");
  this.isProxy = false;
};

ChromeAndroid.prototype.configure = function (args, caps, cb) {
  logger.debug("Looks like we want chrome on android");
  this._deviceConfigure(args, caps);
  var bName = this.args.browserName || "";
  var app = this.appString().toLowerCase() ||
            bName.toString().toLowerCase();
  if (app === "chromium") {
    this.args.androidPackage = "org.chromium.chrome.shell";
    this.args.androidActivity = ".ChromeShellActivity";
  } else if (app === "chromebeta") {
    this.args.androidPackage = "com.chrome.beta";
    this.args.androidActivity = "com.google.android.apps.chrome.Main";
  } else if (app === "browser") {
    this.args.androidPackage = "com.android.browser";
    this.args.androidActivity = "com.android.browser.BrowserActivity";
  } else {
    this.args.androidPackage = "com.android.chrome";
    this.args.androidActivity = "com.google.android.apps.chrome.Main";
  }
  // don't allow setAndroidArgs to reclobber our androidPackage/activity
  delete this.capabilities.appPackage;
  delete this.capabilities.appActivity;
  this.setAndroidArgs();
  this.args.app = null;
  this.args.proxyPort = this.args.chromeDriverPort;
  cb();
};

ChromeAndroid.prototype.startAutomation = function (cb) {
  // this wrapper is required because uiautomator is not instantiated
  // at the beginning of the async#series call
  this.uiautomator.start(cb);
};

ChromeAndroid.prototype.start = function (cb, onDie) {
  this.onDie = onDie;

  async.series([
    this.initAdb.bind(this),
    this.initUiautomator.bind(this),
    this.prepareDevice.bind(this),
    this.prepareChromedriver.bind(this),
    this.pushAndUnlock.bind(this),
    this.forwardPort.bind(this),
    this.pushAppium.bind(this),
    this.startAutomation.bind(this),
    this.getDataDir.bind(this),
    this.createSession.bind(this)
  ], function (err, results) {
    if (err) return cb(err);
    this.didLaunch = true;
    var sessionId = results[results.length - 1];
    cb(null, sessionId);
  }.bind(this));
};

ChromeAndroid.prototype.prepareChromedriver = function (cb) {
  var chromeArgs = {
    port: this.args.proxyPort
  , executable: this.args.chromedriverExecutable
  , deviceId: this.adb.curDeviceId
  , enablePerformanceLogging: this.args.enablePerformanceLogging
  };
  this.chromedriver = new Chromedriver(chromeArgs, this.adb,
      this.onChromedriverExit.bind(this));
  this.proxyTo = this.chromedriver.proxyTo.bind(this.chromedriver);
  this.proxyHost = this.chromedriver.proxyHost;
  this.proxyPort = this.chromedriver.proxyPort;
  this.deleteSession = this.chromedriver.deleteSession.bind(this.chromedriver);
  cb();
};

ChromeAndroid.prototype.pushAndUnlock = function (cb) {
  this.pushUnlock(function (err) {
    if (err) return cb(err);
    this.unlock(cb);
  }.bind(this));
};

ChromeAndroid.prototype.createSession = function (cb) {
  var caps = {
    chromeOptions: {
      androidPackage: this.args.appPackage
    }
  };

  var knownPackages = ["org.chromium.chrome.shell",
                       "com.android.chrome",
                       "com.chrome.beta"];

  if (!_.contains(knownPackages, this.args.appPackage)) {
    caps.chromeOptions.androidActivity = this.args.appActivity;
  }

  caps = this.decorateChromeOptions(caps);
  this.chromedriver.createSession(caps, cb);
};

ChromeAndroid.prototype.stop = function (cb) {
  this.uiautomator.shutdown(function () {
    this.chromedriver.stop(function (err) {
      if (err) return cb(err);
      this.adb.forceStop(this.args.appPackage, function (err) {
        if (err) return cb(err);
        this.adb.stopLogcat(cb);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

ChromeAndroid.prototype.onChromedriverExit = function () {
  if (!this.adb) return; // cleaning up has already occured.
  async.series([
    this.adb.getConnectedDevices.bind(this.adb),
    _.partial(this.adb.forceStop.bind(this.adb), this.args.appPackage)
  ], function (err) {
    if (err) logger.error(err.message);
    this.adb.stopLogcat(this.onDie.bind(this));
  }.bind(this));
};

// since we're in chrome, our default context is not the native mode, but web
ChromeAndroid.prototype.defaultContext = function () {
  return WEBVIEW_BASE + "1";
};

// write a new getContexts function that hard-codes the two available contexts
ChromeAndroid.prototype.getContexts = function (cb) {
  this.contexts = [NATIVE_WIN, this.defaultContext()];
  logger.info("Available contexts: " + this.contexts);
  cb(null, {
    status: status.codes.Success.code
  , value: this.contexts
  });
};

// write a new setContext function that handles starting and stopping of
// chrome mode; the default android context controller method won't work here
// because here we don't need to worry about starting/stopping chromedriver
// itself; it's already on
ChromeAndroid.prototype.setContext = function (name, cb) {
  if (name === null) {
    name = this.defaultContext();
  } else if (name === WEBVIEW_WIN) {
    name = this.defaultContext();
  }
  this.getContexts(function () {
    if (!_.contains(this.contexts, name)) {
      return cb(null, {
        status: status.codes.NoSuchContext.code
      , value: "Context '" + name + "' does not exist"
      });
    }
    if (name === this.curContext) {
      return jwpSuccess(cb);
    }
    if (name.indexOf(WEBVIEW_WIN) !== -1) {
      this.setChromedriverMode();
    } else {
      this.setNativeMode();
    }
    this.curContext = name;
    jwpSuccess(cb);
  }.bind(this));
};

module.exports = ChromeAndroid;
