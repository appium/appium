"use strict";

var IOS = require('./ios.js')
  , logger = require('../../server/logger.js').get('appium')
  , path = require('path')
  , helpers = require('../../helpers.js')
  , cleanSafari = helpers.cleanSafari
  , checkSafari = helpers.checkSafari
  , getiOSSDKVersion = helpers.getiOSSDKVersion
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
    this.configureSafari(cb);
  }
};

Safari.prototype.configureSafari = function (cb) {
  var safariVer = null;
  if (typeof this.args.platformVersion !== "undefined" &&
      this.args.platformVersion) {
    safariVer = this.args.platformVersion;
  }
  if (parseFloat(safariVer) >= 8) {
    logger.debug("We're on iOS8+ so not copying mobile safari app");
    this.args.bundleId = SAFARI_BUNDLE;
    this.args.app = null;
    return cb();
  }
  logger.debug("Trying to use mobile safari, version " + safariVer);
  var checkNext = function (attemptedApp, origApp, safariVer) {
    logger.debug("Using mobile safari app at " + attemptedApp);
    this.args.app = attemptedApp;
    logger.debug("Cleaning mobile safari data files");
    cleanSafari(safariVer, function (err) {
      if (err) {
        logger.error(err.message);
        cb(err);
      } else {
        this.args.origAppPath = origApp;
        cb(null);
      }
    }.bind(this));
  }.bind(this);
  var sdkNext = function (safariVer) {
    checkSafari(safariVer, this.args.tmpDir, function (err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare mobile safari with version '" +
                     safariVer + "': " + err);
        return cb(err);
      }
      checkNext(attemptedApp, origApp, safariVer);
    });
  }.bind(this);

  if (safariVer === null) {
    getiOSSDKVersion(function (err, safariVer) {
      if (err) return cb(err);
      sdkNext(safariVer);
    });
  } else {
    sdkNext(safariVer);
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
    this.isAppInstalled("com.bytearc.SafariLauncher", function (err) {
      if (err) {
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
