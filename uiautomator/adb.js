"use strict";

var spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , path = require('path')
  , logger = require('../logger').get('appium')
  , _ = require('underscore');

var ADB = function(opts, cb) {
  if (!opts) {
    opts = {};
  }
  if (typeof opts.sdkRoot === "undefined") {
    opts.sdkRoot = process.env.ANDROID_HOME || '';
  }
  this.sdkRoot = opts.sdkRoot;
  this.avdName = opts.avdName;
  this.adb = "adb";
  this.curDeviceId = null;
  if (this.sdkRoot) {
    this.adb = path.resolve(this.sdkRoot, "platform-tools", "adb");
    logger.info("Using adb from " + this.adb);
    cb(null, this);
  } else {
    exec("which adb", _.bind(function(err, stdout) {
      if (stdout) {
        logger.info("Using adb from " + stdout);
        this.adb = stdout;
        cb(null, this);
      } else {
        cb("Could not find adb; do you have android SDK installed?", null);
      }
    }, this));
  }
};

ADB.prototype.getConnectedDevices = function(cb) {
  logger.info("Getting connected devices...");
  exec(this.adb + " devices", _.bind(function(err, stdout) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      var output = stdout.replace("List of devices attached", "").trim();
      var devices = [];
      _.each(output.split("\n"), function(device) {
        if (device) {
          devices.push(device.split("\t"));
        }
      });
      logger.info("\t" + devices.length + " device(s) connected");
      if (devices.length) {
        this.curDeviceId = devices[0][0];
      }
      cb(null, devices);
    }
  }, this));
};

ADB.prototype.forwardPort = function(systemPort, devicePort) {
};

ADB.prototype.isDeviceConnected = function(cb) {
  this.getConnectedDevices(function(err, devices) {
    if (err) {
      cb(err);
    } else {
      cb(null, devices.length > 0);
    }
  });
};

ADB.prototype.setDeviceId = function(deviceId) {
  this.curDeviceId = deviceId;
};

ADB.prototype.requireDeviceId = function() {
  if (!this.curDeviceId) {
    throw new Error("This method requires that a device ID is set. " +
                        "Call getConnectedDevices or setDeviceId");
  }
};

ADB.prototype.waitForDevice = function(cb) {
  this.requireDeviceId();
  logger.info("Waiting for device " + this.curDeviceId + " to be ready");
  exec(this.adb + " -s " + this.curDeviceId + " wait-for-device", function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      logger.info("\tready!");
      cb(null);
    }
  });
};

ADB.prototype.pushAppium = function(cb) {
  logger.info("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "bootstrap", "bin", "AppiumBootstrap.jar");
  var remotePath = "/data/local/tmp";
  exec(this.adb + " push " + binPath + " " + remotePath, function(err) {
    if (err) {
      logger.error(err);
      cb(err);
    } else {
      logger.info("\tdone");
      cb(null);
    }
  });
};

module.exports = function(opts, cb) {
  return new ADB(opts, cb);
};
