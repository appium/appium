"use strict";
var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , md5 = require('MD5')
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
        cb(err);
      } else {
        cb();
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
  if (this.apkPath === null) {
    logger.info("Skipping install since we launched with a package instead " +
                "of an app path");
    return cb();
  }

  this.adb.isAppInstalled(this.appPackage, function(err, installed) {
    if (installed && this.fastReset) {
      this.adb.stopAndClear(this.appPackage, cb);
    } else if (!installed) {
      this.adb.checkAndSignApk(this.apkPath, function(err) {
        if (err) return cb(err);
        this.adb.mkdir(this.remoteTempPath(), function(err) {
          if (err) return cb(err);
          this.getAppMd5(function(err, md5) {
            var remoteApk = this.remoteTempPath() + md5 + '.apk';
            if (err) return cb(err);
            this.removeTempApks([md5], function(err, appExists) {
              if (err) return cb(err);
              if (appExists) return cb();
              this.adb.pushAndInstallApp(this.apkPath, remoteApk, cb);
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    } else {
      cb();
    }
  }.bind(this));
};

androidCommon.getAppMd5 = function(cb) {
  fs.readFile(this.apkPath, function(err, buffer) {
    if (err) return cb(err);
    cb(md5(buffer));
  }.bind(this));
};

androidCommon.remoteTempPath = function() {
  return "/data/local/tmp/";
};

androidCommon.removeTempApks = function(exceptMd5s, cb) {
  if (typeof exceptMd5s === "function") {
    cb = exceptMd5s;
    exceptMd5s = [];
  }

  var listApks = function(cb) {
    var cmd = 'ls /data/local/tmp/*.apk';
    this.adb.shell(cmd, function(err, stdout) {
      if (err || stdout.indexOf("No such file") !== -1) {
        return cb(null, []);
      }
      var apks = stdout.split("\n");
      cb(null, apks);
    });
  }.bind(this);

  var removeApks = function(apks, cb) {
    var matchingApkFound = false;
    var noMd5Matched = true;
    var removes = [];
    _.each(apks, function(path) {
      path = path.trim();
      noMd5Matched = true;
      _.each(exceptMd5s, function(md5) {
        if (path !== '' && path.indexOf(md5) !== -1) {
          noMd5Matched = false;
        }
      });
      if (noMd5Matched) {
        removes.push('rm \\"' + path + '\\"');
      } else {
        matchingApkFound = true;
      }
    });

    // Invoking adb shell with an empty string will open a shell console
    // so return here if there's nothing to remove.
    if (removes.length < 1) {
      return cb(null, matchingApkFound);
    }

    var cmd = removes.join[" && "];
    this.adb.shell(cmd, function() {
      cb(null, matchingApkFound);
    });
  }.bind(this);

  async.waterfall([
    function(cb) { listApks(cb); },
    function(apks, cb) { removeApks(apks, cb); }
  ], function(err, matchingApkFound) { cb(null, matchingApkFound); });
};

androidCommon.forwardPort = function(cb) {
  this.adb.forwardPort(this.opts.systemPort, this.opts.devicePort, cb);
};

module.exports = androidCommon;
