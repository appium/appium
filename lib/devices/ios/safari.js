"use strict";

var IOS = require('./ios.js')
  , logger = require('../../server/logger.js').get('appium')
  , status = require("../../server/status.js")
  , path = require('path')
  , helpers = require('../../helpers.js')
  , cleanSafari = helpers.cleanSafari
  , checkSafari = helpers.checkSafari
  , getiOSSDKVersion = helpers.getiOSSDKVersion
  , _ = require('underscore');

var Safari = function () {
  this.init();
  this.landscapeWebCoordsOffset = 40;
};

_.extend(Safari.prototype, IOS.prototype);

Safari.prototype.configure = function (args, caps, cb) {
  logger.info("Configuring Safari session");
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
  logger.info("Trying to use mobile safari, version " + safariVer);
  var checkNext = function (attemptedApp, origApp, safariVer) {
    logger.info("Using mobile safari app at " + attemptedApp);
    this.args.app = attemptedApp;
    logger.info("Cleaning mobile safari data files");
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
    checkSafari(safariVer, function (err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare mobile safari with version '" +
                     safariVer + "': " + err);
        return cb(err);
      }
      checkNext(attemptedApp, origApp, safariVer);
    });
  };

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
  return !!this.args.udid;
};

Safari.prototype.navToInitialWebview = function (cb) {
  if (this.args.udid) {
    setTimeout(function () {
      //the latest window is the one newly created by Safari launcher.
      this.navToLatestAvailableWebview(cb);
    }.bind(this), 6000);
  } else {
    this.navToLatestAvailableWebview(cb);
  }
};

Safari.prototype.navToLatestAvailableWebview = function (cb) {
  if (parseInt(this.iOSSDKVersion, 10) >= 7 && !this.args.udid) {
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
  this.findAndAct('xpath', '//scrollview[1]/button[1]', 0, 'click',
      [], function (err, res) {
    this.implicitWaitMs = oldImpWait;
    if (err || res.status !== status.codes.Success.code) {
      var msg = "Could not find button to click to get into webview. " +
                "Proceeding on the assumption we have a working one.";
      logger.error(msg);
    }
    this.navToView(cb);
  }.bind(this));
};

Safari.prototype.navToView = function (cb) {
  logger.info("Navigating to most recently opened webview");
  var start = Date.now();
  var spinHandles = function () {
    this.getContexts(function (err, res) {
      if (res.status !== 0) {
        cb(new Error("Could not navigate to webview! Code: " + res.status));
      } else if (res.value.length < 2) {
        // NATIVE_WIN is always in the list of contexts, so we need at least
        // 2 contexts to know we have an active webview
        if ((Date.now() - start) < 6000) {
          logger.warn("Could not find any webviews yet, retrying");
          return setTimeout(spinHandles, 500);
        }
        cb(new Error("Could not navigate to webview; there aren't any!"));
      } else {
        var latestWindow = res.value[res.value.length - 1];
        logger.info("Picking webview " + latestWindow);
        this.setContext(latestWindow, function (err) {
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
  var nonSynthetic = _.isUndefined(this.capabilities.nonSyntheticWebClick) ?
    parseInt(this.iOSSDKVersion, 10) >= 7 : this.capabilities.nonSyntheticWebClick;
  if (nonSynthetic && !this.args.udid) {
    // atoms-based clicks don't always work in safari 7
    this.nonSyntheticWebClick(elementId, cb);
  } else {
    this._click(elementId, cb);
  }
};

Safari.prototype.setBundleId = function (cb) {
  this.args.bundleId = "com.apple.mobilesafari";
  cb();
};

Safari.prototype._setInitialOrientation = IOS.prototype.setInitialOrientation;
Safari.prototype.setInitialOrientation = function (cb) {
  if (this.args.udid) {
    logger.info("Not setting initial orientation because we're on " +
                "SafariLauncher");
    return cb();
  }
  this._setInitialOrientation(cb);
};

Safari.prototype._setBootstrapConfig = IOS.prototype.setBootstrapConfig;
Safari.prototype.setBootstrapConfig = function (cb) {
  if (this.args.udid) {
    logger.info("Not setting bootstrap config because we're on " +
                "SafariLauncher");
    return cb();
  }
  this._setBootstrapConfig(cb);
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
    logger.info("Not installing to real device since we're on sim");
    cb();
  }
};

Safari.prototype._stopRemote = IOS.prototype.stopRemote;
Safari.prototype.stopRemote = function () {
  this._stopRemote(true);
};

Safari.prototype._stop = IOS.prototype.stop;
Safari.prototype.stop = function (cb) {
  if (this.args.udid) {
    logger.info("Stopping safariLauncher");
    this.shutdown(null, null, cb);
  } else {
    this._stop(cb);
  }
};

module.exports = Safari;
