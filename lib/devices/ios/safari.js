"use strict";

var IOS = require('./ios.js')
  , logger = require('../../server/logger.js').get('appium')
  , status = require("../../server/status.js")
  , _ = require('underscore');

var Safari = function (args) {
  this.init(args);
};

_.extend(Safari.prototype, IOS.prototype);

Safari.prototype._start = IOS.prototype.start;
Safari.prototype.start = function (cb, onDie) {
  this._start(function (err) {
    if (err) return cb(err);
    this.navToInitialWebview(cb);
  }.bind(this), onDie);
};

Safari.prototype.navToInitialWebview = function (cb) {
  if (this.isSafariLauncherApp) {
    setTimeout(function () {
      //the latest window is the one newly created by Safari launcher.
      this.navToLatestAvailableWebview(cb);
    }.bind(this), 6000);
  } else {
    this.navToLatestAvailableWebview(cb);
  }
};

Safari.prototype.navToLatestAvailableWebview = function (cb) {
  if (parseInt(this.iOSSDKVersion, 10) >= 7 && !this.udid) {
    this.navToViewThroughFavorites(cb);
  } else {
    this.navToView(cb);
  }
};

Safari.prototype.navToViewThroughFavorites = function (cb) {
  logger.info("We're on iOS7 simulator: clicking apple button to get into " +
              "a webview");
  var oldImpWait = this.implicitWaitMs;
  this.implicitWaitMs = 7000; // wait 7s for apple button to exist
  this.findAndAct('xpath', '//window[2]/scrollview[1]/button[1]', 0, 'click',
      [], function (err, res) {
    this.implicitWaitMs = oldImpWait;
    if (err || res.status !== status.codes.Success.code) {
      var msg = "Could not successfully navigate to a working Safari " +
                "webview. Original error: " + (err ? err.message : "unknown");
      logger.error(msg);
      return cb(new Error(msg));
    }
    this.navToView(cb);
  }.bind(this));
};

Safari.prototype.navToView = function (cb) {
  logger.info("Navigating to most recently opened webview");
  var start = Date.now();
  var spinHandles = function () {
    this.getWindowHandles(function (err, res) {
      if (res.status !== 0) {
        cb(new Error("Could not navigate to webview! Code: " + res.status));
      } else if (res.value.length < 1) {
        if ((Date.now() - start) < 6000) {
          logger.warn("Could not find any webviews yet, retrying");
          return setTimeout(spinHandles, 500);
        }
        cb(new Error("Could not navigate to webview; there aren't any!"));
      } else {
        var latestWindow = res.value[res.value.length - 1];
        logger.info("Picking webview " + latestWindow);
        this.setWindow(latestWindow, function (err) {
          if (err) return cb(err);
          this.remote.cancelPageLoad();
          cb();
        }.bind(this), true);
      }
    }.bind(this));
  }.bind(this);
  spinHandles();
};

Safari.prototype._click = IOS.prototype.click;
Safari.prototype.click = function (elementId, cb) {
  if (parseInt(this.iOSSDKVersion, 10) >= 7 && !this.udid) {
    // atoms-based clicks don't always work in safari 7
    this.nonSyntheticWebClick(elementId, cb);
  } else {
    this._click(elementId, cb);
  }
};

module.exports = Safari;
