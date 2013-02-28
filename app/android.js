"use strict";

var errors = require('./errors')
  , adb = require('../uiautomator/adb')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , deviceCommon = require('./device')
  , NotImplementedError = errors.NotImplementedError
  , UnknownError = errors.UnknownError;

var Android = function(opts) {
  this.rest = opts.rest;
  this.opts = opts;
  //this.apkPath = opts.apkPath;
  //this.appPackage = opts.appPackage;
  //this.appActivity = opts.appActivity;
  this.verbose = opts.verbose;
  this.queue = [];
  this.progress = 0;
  this.onStop = function() {};
  this.implicitWaitMs = 0;
  this.adb = null;
  this.capabilities = {
    platform: 'LINUX'
    , browserName: 'Android'
    , version: '4.1'
    , webStorageEnabled: false
    , takesScreenshots: true
    , javascriptEnabled: true
    , databaseEnabled: false
  };
};

Android.prototype.start = function(cb, onDie) {
  if (typeof onDie === "function") {
    this.onStop = onDie;
  }
  var didLaunch = false;

  var onLaunch = _.bind(function(err) {
    if (err) {
      logger.error("ADB failed to launch!");
      this.adb = null;
      this.onStop = null;
      cb(err);
    } else {
      logger.info("ADB launched! Ready for commands");
      didLaunch = true;
      cb(null);
    }
  }, this);

  var onExit = _.bind(function(code) {
    if (!didLaunch) {
      logger.error("ADB quit before it successfully launched");
      cb("ADB quit unexpectedly before successfully launching");
      code = code || 1;
    } else if (typeof this.cbForCurrentCmd === "function") {
      var error = new UnknownError("ADB died while responding to command, " +
                                   "please check appium logs!");
      this.cbForCurrentCmd(error, null);
      code = code || 1;
    }
    this.adb.uninstallApp(_.bind(function() {
      this.adb = null;
      this.onStop(code);
      this.onStop = null;
    }, this));
  }, this);

  if (this.adb === null) {
    this.adb = adb(this.opts);
    this.adb.start(onLaunch, onExit);
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.stop = function(cb) {
  if (this.adb === null) {
    logger.info("Trying to stop adb but it already exited");
    cb();
  } else {
    if (cb) {
      this.onStop = cb;
    }
    this.adb.sendShutdownCommand(_.bind(function() {
      logger.info("Sent shutdown command, waiting for ADB to stop...");
    }, this));
    this.queue = [];
    this.progress = 0;
  }
};

Android.prototype.proxy = deviceCommon.proxy;
Android.prototype.respond = deviceCommon.respond;

Android.prototype.push = function(elem) {
  this.queue.push(elem);

  var next = _.bind(function() {
    if (this.queue.length <= 0 || this.progress > 0) {
      return;
    }

    var target = this.queue.shift()
      , action = target[0][0]
      , params = typeof target[0][1] === "undefined" ? {} : target[0][1]
      , cb = target[1];

    this.cbForCurrentCmd = cb;

    this.progress++;

    this.adb.sendAutomatorCommand(action, params, _.bind(function(response) {
      this.cbForCurrentCmd = null;
      if (typeof cb === 'function') {
        this.respond(response, cb);
      }

      // maybe there's moar work to do
      this.progress--;
      next();
    }, this));
  }, this);

  next();
};

Android.prototype.setCommandTimeout = function(secs, cb) {
  // do nothing here for now
  cb();
};

Android.prototype.resetCommandTimeout = function(cb) {
  cb();
};

Android.prototype.getCommandTimeout = function(cb) {
};

Android.prototype.findElement = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, false, cb);
};

Android.prototype.findElements = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, true, cb);
};

Android.prototype.findElementOrElements = function(strategy, selector, many, cb) {
  var params = {
    strategy: strategy
    , selector: selector
    , context: ""
    , multiple: many
  };
  this.proxy(["find", params], cb);
};

Android.prototype.findElementFromElement = function(element, strategy, selector, cb) {
};

Android.prototype.findElementsFromElement = function(element, strategy, selector, cb) {
};

Android.prototype.setValueImmediate = function(elementId, value, cb) {
};

Android.prototype.setValue = function(elementId, value, cb) {
};

Android.prototype.click = function(elementId, cb) {
};

Android.prototype.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
  this.proxy(["click", {x: x, y: y}], cb);
};

Android.prototype.clear = function(elementId, cb) {
};

Android.prototype.getText = function(elementId, cb) {
};

Android.prototype.getAttribute = function(elementId, attributeName, cb) {
};

Android.prototype.getLocation = function(elementId, cb) {
};

Android.prototype.getSize = function(elementId, cb) {
};

Android.prototype.getWindowSize = function(windowHandle, cb) {
};

Android.prototype.getPageIndex = function(elementId, cb) {
};

Android.prototype.keys = function(elementId, keys, cb) {
};

Android.prototype.frame = function(frame, cb) {
};

Android.prototype.implicitWait = function(ms, cb) {
};

Android.prototype.elementDisplayed = function(elementId, cb) {
};

Android.prototype.elementEnabled = function(elementId, cb) {
};

Android.prototype.getPageSource = function(cb) {
};

Android.prototype.getAlertText = function(cb) {
};

Android.prototype.postAcceptAlert = function(cb) {
};

Android.prototype.postDismissAlert = function(cb) {
};

Android.prototype.getOrientation = function(cb) {
};

Android.prototype.setOrientation = function(orientation, cb) {
};

Android.prototype.getScreenshot = function(cb) {
};

Android.prototype.fakeFlick = function(xSpeed, ySpeed, swipe, cb) {
};

Android.prototype.fakeFlickElement = function(elementId, xoffset, yoffset, speed, cb) {
};

Android.prototype.swipe = function(startX, startY, endX, endY, duration, touchCount, elId, cb) {
};

Android.prototype.flick = function(startX, startY, endX, endY, touchCount, elId, cb) {
};

Android.prototype.hideKeyboard = function(keyName, cb) {
};

Android.prototype.url = function(url, cb) {
};

Android.prototype.active = function(cb) {
};

Android.prototype.getWindowHandle = function(cb) {
};

Android.prototype.getWindowHandles = function(cb) {
};

Android.prototype.setWindow = function(name, cb) {
};

Android.prototype.clearWebView = function(cb) {
};

Android.prototype.execute = function(script, args, cb) {
};

Android.prototype.title = function(cb) {
};

module.exports = function(opts) {
  return new Android(opts);
};
