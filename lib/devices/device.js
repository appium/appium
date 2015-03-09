"use strict";

var fs = require('fs')
  , path = require('path')
  , _ = require('underscore')
  , logger = require('../server/logger.js').get('appium')
  , helpers = require('../helpers.js')
  , isWindows = require('appium-support').system.isWindows
  , copyLocalZip = helpers.copyLocalZip
  , unzipApp = helpers.unzipApp
  , downloadFile = helpers.downloadFile
  , capConversion = require('../server/capabilities.js').capabilityConversions
  , DeviceSettings = require('./device-settings.js')
  , url = require('url');

var Device = function () {
  throw new Error("Cannot instantiate Device directly");
};

Device.prototype.init = function () {
  this.appExt = null;
  this.tempFiles = [];
  this.args = {};
  this.capabilities = {};
  this.settings = new DeviceSettings();
};

Device.prototype.configure = function (args, caps) {
  _.extend(this.args, args);
  _.extend(this.capabilities, caps);
  _.each(caps, function (val, cap) {
    this.setArgFromCap(cap, cap);
  }.bind(this));
  if (this.args.tmpDir === null) {
    // use a custom tmp dir to avoid loosing data and app
    // when computer is restarted
    this.args.tmpDir = process.env.APPIUM_TMP_DIR ||
      (isWindows() ? process.env.TEMP : "/tmp");
  }
  if (this.args.traceDir === null) {
    this.args.traceDir = path.resolve(this.args.tmpDir , 'appium-instruments');
  }
};

Device.prototype.setArgFromCap = function (arg, cap) {
  if (typeof this.capabilities[cap] !== "undefined") {
    if (_.has(capConversion, cap)) {
      var key = capConversion[cap];
      if (!_.has(this.capabilities, key)) {
        // if we have both 'version' and 'platformVersion' caps being sent,
        // make sure 'platformVersion' isn't overwritten by 'version'
        this.args[key] = this.capabilities[cap];
      }
    } else {
      this.args[arg] = this.capabilities[cap];
    }
  }
};

Device.prototype.appString = function () {
  return this.args.app ? this.args.app.toString() : '';
};

Device.prototype.configureApp = function (cb) {
  if (this.args.app.substring(0, 4).toLowerCase() === "http") {
    this.configureDownloadedApp(cb);
  } else {
    this.configureLocalApp(cb);
  }
};

Device.prototype.configureLocalApp = function (cb) {
  this.args.app = path.resolve(this.args.app);
  var appPath = this.args.app;
  var origin = this.capabilities.app ? "desired caps" : "command line";
  var ext = appPath.substring(appPath.length - 4).toLowerCase();
  if (ext === this.appExt) {
    this.args.app = appPath;
    logger.debug("Using local app from " + origin + ": " + appPath);
    fs.stat(appPath, function (err) {
      if (err) {
        return cb(new Error("Error locating the app: " + err.message));
      }
      cb();
    });
  } else if (ext === ".zip" || ext === ".ipa") {
    logger.debug("Using local " + ext + " from " + origin + ": " + appPath);
    this.unzipLocalApp(appPath, function (zipErr, newAppPath) {
      if (zipErr) return cb(zipErr);
      if (ext === ".ipa") {
        this.args.ipa = this.args.app;
      }
      this.args.app = newAppPath;
      logger.debug("Using locally extracted app: " + this.args.app);
      cb();
    }.bind(this));
  } else {
    var msg = "Using local app, but didn't end in .zip, .ipa or " + this.appExt;
    logger.error(msg);
    cb(new Error(msg));
  }
};

Device.prototype.appIsPackageOrBundle = function (app) {
  return (/^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/).test(app);
};

Device.prototype.configureDownloadedApp = function (cb) {
  var origin = this.capabilities.app ? "desired caps" : "command line";
  var appUrl;
  try {
    appUrl = url.parse(this.args.app);
  } catch (err) {
    cb("Invalid App URL (" + this.args.app + ")");
  }
  var ext = path.extname(appUrl.pathname);
  if (ext === ".apk") {
    try {
      downloadFile(url.format(appUrl), ".apk", function (appPath) {
        this.tempFiles.push(appPath);
        this.args.app = appPath;
        cb();
      }.bind(this));
    } catch (e) {
      var err = e.toString();
      logger.error("Failed downloading app from appUrl " + appUrl.href);
      cb(err);
    }
  } else if (ext === ".zip" || ext === ".ipa") {
    try {
      this.downloadAndUnzipApp(url.format(appUrl), function (zipErr, appPath) {
        if (zipErr) {
          cb(zipErr);
        } else {
          this.args.app = appPath;
          logger.debug("Using extracted app: " + this.args.app);
          cb();
        }
      }.bind(this));
      logger.debug("Using downloadable app from " + origin + ": " + appUrl.href);
    } catch (e) {
      var err = e.toString();
      logger.error("Failed downloading app from appUrl " + appUrl.href);
      cb(err);
    }
  } else {
    cb("App URL (" + this.args.app + ") didn't seem to point to a .zip, " +
       ".apk, or .ipa file");
  }
};

Device.prototype.unzipLocalApp = function (localZipPath, cb) {
  try {
    copyLocalZip(localZipPath, function (err, zipPath) {
      if (err) return cb(err);
      this.unzipApp(zipPath, cb);
    }.bind(this));
  } catch (e) {
    logger.error("Failed copying and unzipping local app: " + localZipPath);
    cb(e);
  }
};

Device.prototype.unzipApp = function (zipPath, cb) {
  this.tempFiles.push(zipPath);
  unzipApp(zipPath, this.appExt, function (err, appPath) {
    if (err) {
      cb(err, null);
    } else {
      this.tempFiles.push(appPath);
      cb(null, appPath);
    }
  }.bind(this));
};

Device.prototype.downloadAndUnzipApp = function (appUrl, cb) {
  downloadFile(appUrl, ".zip", function (zipPath) {
    this.unzipApp(zipPath, cb);
  }.bind(this));
};

// get a specific setting
Device.prototype.getSetting = function (str) {
  return this.settings._settings[str];
};

module.exports = Device;
