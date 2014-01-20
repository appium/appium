"use strict";
var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , status = require("../../server/status.js")
  , fs = require('fs')
  , path = require('path')
  , md5 = require('md5calculator')
  , async = require('async');

var logTypesSupported = {
  'logcat' : 'Logs for Android applications on real device and emulators ' +
             'via ADB'
};

var androidCommon = {};

androidCommon.background = function(secs, cb) {
  this.adb.getFocusedPackageAndActivity(function(err, pack, activity) {
    if (err) return cb(err);

    this.adb.keyevent("3", function(err) {
      if (err) return cb(err);

      setTimeout(function() {
        this.adb.startApp(this.appPackage, this.appActivity, activity, true, false, function(err) {
          if (err) return cb(err);
          cb(null, {
            status: status.codes.Success.code
            , value: null
          });
        });
      }.bind(this), secs * 1000);
    }.bind(this));
  }.bind(this));
};

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
      if (err && err.message.indexOf('No devices') === -1) return cb(err);
      if (this.avdName.replace('@','') === runningAVDName) {
        logger.info("Did not launch AVD because it was already running.");
        return cb();
      }
      this.adb.launchAVD(this.avdName, cb);
    }.bind(this));
  } else {
    cb();
  }
};

androidCommon.prepareActiveDevice = function(cb) {
  this.adb.getDevicesWithRetry(function(err, devices) {
    if (err) return cb(err);
    var deviceId = null;
    if (this.adb.udid) {
      if (!_.contains(_.pluck(devices, 'udid'), this.adb.udid)) {
        return cb(new Error("Device " + this.adb.udid + " was not in the list " +
                            "of connected devices"));
      }
      deviceId = this.adb.udid;
    } else {
      deviceId = devices[0].udid;
      var emPort = this.adb.getPortFromEmulatorString(deviceId);
      this.adb.setEmulatorPort(emPort);
    }
    logger.info("Setting device id to " + deviceId);
    this.adb.setDeviceId(deviceId);
    cb();
  }.bind(this));
};

androidCommon.resetApp = function(cb) {
  if (this.fastClear) {
    logger.info("Running fastClear");
    this.adb.stopAndClear(this.appPackage, cb);
  } else {
    logger.info("Running old fashion clear (reinstall)");
    this.remoteApkExists(function(err, remoteApk) {
      if (err) return cb(err);
      if (!remoteApk) {
        return cb(new Error("Can't run clear if remote apk doesn't exist"));
      }
      this.adb.forceStop(this.appPackage, function(err) {
        if (err) return cb(err);
        this.adb.uninstallApk(this.appPackage, function(err) {
          if (err) return cb(err);
          this.adb.installRemote(remoteApk, cb);
        }.bind(this));
      }.bind(this));
    }.bind(this));
  }
};

androidCommon.getRemoteApk = function(cb) {
  var next = function() {
    cb(null, this.remoteTempPath() + this.appMd5Hash + '.apk', this.appMd5Hash);
  }.bind(this);

  if (this.appMd5Hash) {
    next();
  } else {
    this.getAppMd5(function(err, md5Hash) {
      if (err) return cb(err);
      this.appMd5Hash = md5Hash;
      next();
    }.bind(this));
  }
};

androidCommon.remoteApkExists = function(cb) {
  this.getRemoteApk(function(err, remoteApk) {
    if (err) return cb(err);
    this.adb.shell("ls " + remoteApk, function(err, stdout) {
      if (err) return cb(err);
      if (stdout.indexOf("No such file") !== -1) {
        return cb(new Error("remote apk did not exist"));
      }
      cb(null, stdout.trim());
    });
  }.bind(this));
};
androidCommon.uninstallApp = function(cb) {
  var next = function() {
    this.adb.uninstallApk(this.appPackage, function(err) {
      if (err) return cb(err);
      cb(null);
    }.bind(this));
  }.bind(this);

  if (this.skipUninstall) {
    logger.debug("Not uninstalling app since server not started with " +
      "--full-reset");
    cb();
  } else {
    next();
  }
};

androidCommon.installApp = function(cb) {
  if (this.apkPath === null) {
    logger.info("Skipping install since we launched with a package instead " +
                "of an app path");
    return cb();
  }

  this.remoteApkExists(function(err, remoteApk) {
    // err is set if the remote apk doesn't exist so don't check it.
    this.adb.isAppInstalled(this.appPackage, function(err, installed) {
      if (installed && this.opts.fastReset && (this.fastClear || remoteApk)) {
        this.resetApp(cb);
      } else if (!installed || (this.opts.fastReset && !this.fastClear && !remoteApk)) {
        this.adb.checkAndSignApk(this.apkPath, this.appPackage, function(err) {
          if (err) return cb(err);
          this.adb.mkdir(this.remoteTempPath(), function(err) {
            if (err) return cb(err);
            this.getRemoteApk(function(err, remoteApk, md5Hash) {
              if (err) return cb(err);
              this.removeTempApks([md5Hash], function(err, appExists) {
                if (err) return cb(err);
                var install = function(err) {
                  if (err) return cb(err);
                  this.adb.installRemote(remoteApk, cb);
                }.bind(this);
                if (appExists) {
                  install();
                } else {
                  this.adb.push(this.apkPath, remoteApk, install);
                }
              }.bind(this));
            }.bind(this));
          }.bind(this));
        }.bind(this));
      } else {
        cb();
      }
    }.bind(this));
  }.bind(this));
};

androidCommon.getAppMd5 = function(cb) {
  md5(this.apkPath, function(err, md5Hash) {
    if (err) return cb(err);
    logger.info("MD5 for app is " + md5Hash);
    cb(null, md5Hash);
  }.bind(this));
};

androidCommon.remoteTempPath = function() {
  return "/data/local/tmp/";
};

androidCommon.removeTempApks = function(exceptMd5s, cb) {
  logger.info("Removing any old apks");
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
    if (apks.length < 1) {
      logger.info("No apks to examine");
      return cb();
    }
    var matchingApkFound = false;
    var noMd5Matched = true;
    var removes = [];
    _.each(apks, function(path) {
      path = path.trim();
      if (path !== "") {
        noMd5Matched = true;
       _.each(exceptMd5s, function(md5Hash) {
          if (path.indexOf(md5Hash) !== -1) {
            noMd5Matched = false;
          }
        });
        if (noMd5Matched) {
          removes.push('rm "' + path + '"');
        } else {
          logger.info("Found an apk we want to keep at " + path);
          matchingApkFound = true;
        }
      }
    });

    // Invoking adb shell with an empty string will open a shell console
    // so return here if there's nothing to remove.
    if (removes.length < 1) {
      logger.info("Couldn't find any apks to remove");
      return cb(null, matchingApkFound);
    }

    var cmd = removes.join(" && ");
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

androidCommon.pushUnlock = function(cb) {
  logger.debug("Pushing unlock helper app to device...");
  var unlockPath = path.resolve(__dirname, "..", "..", "..", "build",
      "unlock_apk", "unlock_apk-debug.apk");
  fs.stat(unlockPath, function(err) {
    if (err) {
      cb(new Error("Could not find unlock.apk; please run " +
                   "'reset.sh --android' to build it."));
    } else {
      this.adb.install(unlockPath, false, cb);
    }
  }.bind(this));
};

androidCommon.unlockScreen = function(cb) {
  this.adb.isScreenLocked(function(err, isLocked) {
    if (err) return cb(err);
    if (isLocked) {
      var timeoutMs = 10000;
      var start = Date.now();
      var unlockAndCheck = function() {
        logger.debug("Screen is locked, trying to unlock");
        this.adb.startApp("io.appium.unlock", ".Unlock", function(err) {
          if (err) return cb(err);
          this.adb.isScreenLocked(function(err, isLocked) {
            if (err) return cb(err);
            if (!isLocked) {
              logger.debug("Screen is unlocked, continuing");
              return cb();
            }
            if ((Date.now() - timeoutMs) > start) {
              return cb(new Error("Screen did not unlock"));
            } else  {
              setTimeout(unlockAndCheck, 1000);
            }
          }.bind(this));
        }.bind(this));
      }.bind(this);
      unlockAndCheck();
    } else {
      logger.debug('Screen already unlocked, continuing.');
      cb();
    }
  }.bind(this));
};

androidCommon.getLog = function(logType, cb) {
    // Check if passed logType is supported
    if (!_.has(logTypesSupported, logType)) {
        return cb(null, {
            status: status.codes.UnknownError.code
            , value: "Unsupported log type '" + logType + "', supported types : " + JSON.stringify(logTypesSupported)
        });
    }
    var logs;
    // Check that current logType and instance is compatible
    if (logType == 'logcat') {
        try {
            logs = this.adb.getLogcatLogs();
        } catch (e) {
            return cb(e);
        }
    }
    // If logs captured sucessfully send response with data, else send error
    if (logs) {
        return cb(null, {
            status: status.codes.Success.code
            , value: logs
        });
    } else {
        return cb(null, {
            status: status.codes.UnknownError.code
            , value: "Incompatible logType for this device"
        });
    }
};

androidCommon.getLogTypes = function(cb) {
    return cb(null, {
        status: status.codes.Success.code
        , value: _.keys(logTypesSupported)
    });
};

androidCommon.getCurrentActivity = function(cb) {
  this.adb.getFocusedPackageAndActivity(function(err, curPackage, activity) {
    if (err) {
      return cb(null, {
        status: status.codes.UnknownError.code
        , value: err.message
      });
    }
    cb(null, {
      status: status.codes.Success.code
      , value: activity
    });
  });
};

module.exports = androidCommon;
