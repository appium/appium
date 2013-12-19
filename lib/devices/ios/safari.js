"use strict";

var IOS = require('./ios.js')
  , logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore');

var Safari = function(args) {
  this.init(args);
};

_.extend(Safari.prototype, IOS.prototype);

Safari.prototype._start = IOS.prototype.start;
Safari.prototype.start = function(cb, onDie) {
  this._start(function(err) {
    if (err) return cb(err);
    this.navToInitialWebview(cb);
  }.bind(this), onDie);
};

Safari.prototype.navToInitialWebview = function(cb) {
  if (this.isSafariLauncherApp) {
    setTimeout(function() {
      //the latest window is the one newly created by Safari launcher.
      this.navToLatestAvailableWebview(cb);
    }.bind(this), 6000);
  } else {
    this.navToLatestAvailableWebview(cb);
  }
};

Safari.prototype.navToLatestAvailableWebview = function(cb) {
  var navToView = function() {
    logger.info("Navigating to most recently opened webview");
    var start = Date.now();
    var spinHandles = function() {
      this.getWindowHandles(function(err, res) {
        if (res.status !== 0) {
          cb(new Error("Could not navigate to webview! Code: " + res.status));
        } else if (res.value.length < 1) {
          if ((Date.now() - start) < 6000) {
            logger.warn("Could not find any webviews yet, retrying");
            return setTimeout(spinHandles, 500);
          }
          cb(new Error("Could not navigate to webview; there aren't any!"));
        } else {
          logger.info("Picking webview " + res.value[0]);
          this.setWindow(res.value[res.value.length - 1], function(err) {
            if (err) return cb(err);
            this.remote.cancelPageLoad();
            cb();
          }.bind(this), true);
        }
      }.bind(this));
    }.bind(this);
    spinHandles();
  }.bind(this);
  if (parseInt(this.iOSSDKVersion, 10) >= 7) {
    logger.info("We're on iOS7: clicking apple button to get into a webview");
    this.findAndAct('xpath', '//window[2]/scrollview[1]/button[1]', 0, 'click', [], function(err, res) {
      if (this.checkSuccess(err, res, cb)) {
        navToView();
      }
    }.bind(this));
  } else {
    navToView();
  }
};

Safari.prototype._click = IOS.prototype.click;
Safari.prototype.click = function(elementId, cb) {
  if (parseInt(this.iOSSDKVersion, 10) >= 7) {
    // atoms-based clicks don't always work in safari 7
    this.nonSyntheticWebClick(elementId, cb);
  } else {
    this._click(elementId, cb);
  }
};

module.exports = Safari;
