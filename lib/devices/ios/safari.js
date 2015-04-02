"use strict";

var IOS = require('./ios.js')
  , logger = require('../../server/logger.js').get('appium')
  , path = require('path')
  , _ = require('underscore');

var NATIVE_REAL_SAFARI_MIN_VER = 7.0
  , SAFARI_BUNDLE = 'com.apple.mobilesafari';

var Safari = function () {
  this.init();
  this.landscapeWebCoordsOffset = 40;
};

_.extend(Safari.prototype, IOS.prototype);

Safari.prototype.configure = function (args, caps, cb) {
  logger.debug("Configuring Safari session");
  this._deviceConfigure(args, caps);
  this.setIOSArgs();
  this.capabilities.safari = true;
  if (this.args.udid) {
    this.dontCleanupSession = true;
    this.args.app = path.resolve(__dirname,
        "../../../build/SafariLauncher/SafariLauncher.zip");
    this.configureLocalApp(cb);
  } else {
    if (parseFloat(this.args.platformVersion) >= 8) {
      logger.debug("We're on iOS8+ so not copying mobile safari app");
      this.args.bundleId = SAFARI_BUNDLE;
      this.args.app = null;
    } else {
      // make sure args.app has something in it so we get to the right spots
      // in moveBuiltInApp()
      this.args.app = "safari";
    }
    cb();
  }
};

Safari.prototype.moveBuiltInApp = function (cb) {
  if (!this.args.udid && this.args.app !== null) {
    logger.debug("Trying to use mobile safari, version " +
                 this.args.platformVersion);
    this.sim.prepareSafari(this.args.tmpDir, function (err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare mobile safari: " + err);
        return cb(err);
      }
      logger.debug("Using mobile safari app at " + attemptedApp);
      this.args.app = attemptedApp;
      this.args.origAppPath = origApp;
      cb();
    }.bind(this));
  } else {
    cb();
  }
};

Safari.prototype._start = IOS.prototype.start;
Safari.prototype.start = function (cb, onDie) {
  var newOnDie = function (err) {
    if (this.args.udid) {
      return; // if we're using SafariLauncher, don't report failure
    }
    onDie(err);
  }.bind(this);

  this._start(function (err) {
    if (err) return cb(err);
    this.navToInitialWebview(cb);
  }.bind(this), newOnDie);
};

Safari.prototype.shouldIgnoreInstrumentsExit = function () {
  return !!this.args.udid &&
         this.iOSSDKVersion < NATIVE_REAL_SAFARI_MIN_VER;
};

Safari.prototype._click = IOS.prototype.click;
Safari.prototype.click = function (elementId, cb) {
  if (this.capabilities.nativeWebTap && !this.args.udid) {
    // atoms-based clicks don't always work in safari 7
    this.nativeWebTap(elementId, cb);
  } else {
    this._click(elementId, cb);
  }
};

Safari.prototype.setBundleId = function (cb) {
  this.args.bundleId = SAFARI_BUNDLE;
  cb();
};

Safari.prototype._setInitialOrientation = IOS.prototype.setInitialOrientation;
Safari.prototype.setInitialOrientation = function (cb) {
  if (this.shouldIgnoreInstrumentsExit()) {
    logger.debug("Not setting initial orientation because we're on " +
                 "SafariLauncher");
    return cb();
  }
  this._setInitialOrientation(cb);
};

Safari.prototype._configureBootstrap = IOS.prototype.configureBootstrap;
Safari.prototype.configureBootstrap = function (cb) {
  if (this.shouldIgnoreInstrumentsExit()) {
    logger.debug("Not setting bootstrap config because we're on " +
                 "SafariLauncher");
    return cb();
  }
  this._configureBootstrap(cb);
};

Safari.prototype.installToRealDevice = function (cb) {
  if (this.args.udid) {
    try {
      if (!this.realDevice) {
        this.realDevice = this.getIDeviceObj();
      }
    } catch (e) {
      return cb(e);
    }
    this.isAppInstalled("com.bytearc.SafariLauncher", function (err, installed) {
      if (err || !installed) {
        this.installApp(this.args.app, cb);
      } else {
        cb();
      }
    }.bind(this));
  } else {
    logger.debug("Not installing to real device since we're on sim");
    cb();
  }
};

Safari.prototype.clearAppData = function (cb) {
  if (this.args.fullReset) {
    // Even though we delete typical apps on a regular reset, we do a good
    // job of getting safari back to its original state, so actually deleting
    // it is overkill in most cases, and requires an instantLaunchAndQuit.
    // So we only delete it if the user requests a full reset
    try {
      this.sim.deleteSafari();
    } catch (e) {
      return cb(e);
    }
    cb();
  } else {
    this.sim.cleanSafari(this.keepAppToRetainPrefs, cb);
  }
};

Safari.prototype._stopRemote = IOS.prototype.stopRemote;
Safari.prototype.stopRemote = function () {
  this._stopRemote(true);
};

Safari.prototype._stop = IOS.prototype.stop;
Safari.prototype.stop = function (cb) {
  if (this.shouldIgnoreInstrumentsExit()) {
    logger.debug("Stopping safariLauncher");
    this.shutdown(null, cb);
  } else {
    this._stop(cb);
  }
};

module.exports = Safari;
