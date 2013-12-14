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
          cb();
        });
      }
    }.bind(this));
  }.bind(this);
  spinHandles();
};

module.exports = Safari;
