"use strict";
var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , async = require('async');

var androidCommon = {};


androidCommon.prepareDevice = function(onReady) {
  logger.info("Preparing device for session");
  async.series([
    function(cb) { this.checkAppPresent(cb); }.bind(this),
    function(cb) { this.adb.checkAdbPresent(cb); }.bind(this),
    function(cb) { this.prepareEmulator(cb); }.bind(this),
    function(cb) { this.prepareActiveDevice(cb); }.bind(this),
    function(cb) { this.adb.waitForDevice(cb); }.bind(this),
    function(cb) { this.adb.startLogcat(cb); }.bind(this)
  ], onReady);
};

androidCommon.checkAppPresent = function(cb) {
  if (this.apkPath === null) {
    logger.info("Not checking whether app is present since we are assuming " +
                "it's already on the device");
    cb();
  } else {
    logger.info("Checking whether app is actually present");
    fs.stat(this.apkPath, function(err) {
      if (err) {
        logger.error("Could not find app apk at " + this.apkPath);
        cb(new Error("Error locating the app apk, supposedly it's at " +
                    this.apkPath + " but we can't stat it. Filesystem error " +
                    "is " + err));
      } else {
        cb(null);
      }
    }.bind(this));
  }
};

androidCommon.prepareEmulator = function(cb) {
  if (this.avdName !== null) {
    this.adb.getRunningAVDName(function(err, runningAVDName) {
      if (err) return cb(err);
      if (this.avdName.replace('@','') === runningAVDName) {
        logger.info("Did not launch AVD because it was already running.");
        return cb();
      }
      this.adb.launchAVD(this.avdName, cb);
    });
  } else {
    cb();
  }
};

androidCommon.prepareActiveDevice = function(cb) {
  this.adb.getDevicesWithRetry(function(err, devices) {
    if (err) return cb(err);
    var deviceId = null;
    if (this.udid) {
      if (!_.contains(_.pluck(devices, 'udid'), this.udid)) {
        return cb(new Error("Device " + this.udid + " was not in the list " +
                            "of connected devices"));
      }
      deviceId = this.udid;
    } else {
      var emPort = this.adb.getPortFromEmulatorString(devices[0].udid);
      this.adb.setEmulatorPort(emPort);
    }
    this.debug("Setting device id to " + deviceId);
    this.adb.setDeviceId(deviceId);
  });
};

androidCommon.installApp = function(cb) {
  var installApp = false;

  if (this.apkPath === null) {
    logger.info("Not installing app since we launched with a package instead " +
                "of an app path");
    return cb();
  }

  var determineInstallStatus = function(cb) {
    logger.info("Determining app install");
    this.adb.isAppInstalled(this.appPackage, function(err, installed) {
      installApp = !installed;
      cb();
    });
  }.bind(this);

  var doInstall = function(cb) {
    if (installApp) {
      this.debug("Installing app apk");
      this.adb.installApp(this.apkPath, cb);
    } else {
      cb();
    }
  }.bind(this);

  var doFastReset = function(cb) {
    // App is already installed so reset it.
    if (!installApp && this.fastReset) {
      this.runFastReset(cb);
    } else { cb(null); }
  }.bind(this);

  async.series([
    function(cb) { determineInstallStatus(cb); },
    function(cb) { doInstall(cb); },
    function(cb) { doFastReset(cb); }
  ], cb);
};


module.exports = androidCommon;
