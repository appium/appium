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
  var isiPhone = this.getDeviceString().toLowerCase().indexOf("ipad") === -1;
  logger.info("Navigating to most recently opened webview");
  var x = isiPhone ? 0.14 : 0.24;
  var y = isiPhone ? 0.23 : 0.13;
  this.complexTap(1, 1, 0.4, x, y, null, function() {
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
  }.bind(this));
};

module.exports = Safari;
