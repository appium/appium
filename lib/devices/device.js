"use strict";

var fs = require('fs')
  , path = require('path')
  , _ = require('underscore')
  , logger = require('../server/logger.js').get('appium')
  , helpers = require('../helpers.js')
  , copyLocalZip = helpers.copyLocalZip
  , unzipApp = helpers.unzipApp
  , downloadFile = helpers.downloadFile
  , capConversion = require('../server/capabilities.js').capabilityConversions
  ;

var Device = function () {
  throw new Error("Cannot instantiate Device directly");
};

Device.prototype.init = function () {
  this.appExt = null;
  this.tempFiles = [];
  this.args = {};
  this.capabilities = {};
};

Device.prototype.configure = function (args, caps) {
  _.extend(this.args, args);
  _.extend(this.capabilities, caps);
  _.each(caps, function (val, cap) {
    this.setArgFromCap(cap, cap);
  }.bind(this));
};

Device.prototype.setArgFromCap = function (arg, cap) {
  if (typeof this.capabilities[cap] !== "undefined") {
    if (_.has(capConversion, cap)) {
      var key = capConversion[cap];
      this.args[key] = this.capabilities[cap];
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
    logger.info("Using local app from " + origin + ": " + appPath);
    fs.stat(appPath, function (err) {
      if (err) {
        return cb(new Error("Error locating the app: " + err.message));
      }
      cb();
    });
  } else if (ext === ".zip" || ext === ".ipa") {
    logger.info("Using local " + ext + " from " + origin + ": " + appPath);
    this.unzipLocalApp(appPath, function (zipErr, newAppPath) {
      if (zipErr) return cb(zipErr);
      this.args.app = newAppPath;
      logger.info("Using locally extracted app: " + this.args.app);
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
  var appUrl = this.args.app ? this.args.app : '';
  if (appUrl.substring(appUrl.length - 4) === ".apk") {
    try {
      downloadFile(appUrl, ".apk", function (appPath) {
        this.tempFiles.push(appPath);
        this.args.app = appPath;
        cb();
      }.bind(this));
    } catch (e) {
      var err = e.toString();
      logger.error("Failed downloading app from appUrl " + appUrl);
      cb(err);
    }
  } else if (appUrl.substring(appUrl.length - 4) === ".zip") {
    try {
      this.downloadAndUnzipApp(appUrl, function (zipErr, appPath) {
        if (zipErr) {
          cb(zipErr);
        } else {
          this.args.app = appPath;
          logger.info("Using extracted app: " + this.args.app);
          cb();
        }
      }.bind(this));
      logger.info("Using downloadable app from " + origin + ": " + appUrl);
    } catch (e) {
      var err = e.toString();
      logger.error("Failed downloading app from appUrl " + appUrl);
      cb(err);
    }
  } else {
    cb("App URL (" + appUrl + ") didn't seem to end in .zip or .apk");
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

module.exports = Device;
