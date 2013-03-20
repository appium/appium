// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/appium.py
"use strict";
var routing = require('./routing')
  , logger = require('../logger').get('appium')
  , setLogFile = require('../logger').setLogFile
  , setWebhook = require('../logger').setWebhook
  , helpers = require('./helpers')
  , downloadFile = helpers.downloadFile
  , unzipApp = helpers.unzipApp
  , checkSafari = helpers.checkSafari
  , copyLocalZip = helpers.copyLocalZip
  , UUID = require('uuid-js')
  , _ = require('underscore')
  , ios = require('./ios')
  , android = require('./android')
  , status = require("./uiauto/lib/status");

var Appium = function(args) {
  this.args = args;
  if (!this.args.verbose) {
    logger.transports.console.level = 'warn';
  }
  if (this.args.log) {
    setLogFile(logger, this.args.log);
  }
  if (this.args.webhook) {
    var host = this.args.webhook;
    var port = 9003;
    if (host.indexOf(':') > -1) {
      try {
        host = host.substring(0, host.indexOf(':'));
        port = this.args.webhook.substring(this.args.webhook.indexOf(':')+1);
        port = parseInt(port, 10);
      } catch (e) {
      }
    }
    setWebhook(logger, port, host);
  }
  this.rest = null;
  this.devices = {};
  this.deviceType = null;
  this.device = null;
  this.sessionId = null;
  this.desiredCapabilities = {};
  this.sessions = [];
  this.counter = -1;
  this.progress = -1;
  this.tempFiles = [];
  this.origApp = null;
  this.preLaunched = false;
  this.fastReset = false;

  if (this.args.fastReset) {
    this.fastReset = true;
  }
};

Appium.prototype.attachTo = function(rest, cb) {
  this.rest = rest;

  // Import the routing rules
  routing(this);

  if (cb) {
    cb();
  }
};

Appium.prototype.preLaunch = function(cb) {
  logger.info("Pre-launching app");
  if (!this.args.app && !this.args.safari) {
    logger.error("Cannot pre-launch app if it isn't passed in via --app or --safari");
    process.exit();
  } else {
    var me = this;
    var caps = {};
    this.start(caps, function(err, device) {
      if (err) {
        cb(err, null);
      } else {
        // since we're prelaunching, it might be a while before the first
        // command comes in, so let's not have instruments quit on us
        device.setCommandTimeout(600, function() {
          me.preLaunched = true;
          cb(null, me);
        });
      }
    });
  }
};

Appium.prototype.start = function(desiredCaps, cb) {
  this.origApp = this.args.app;
  this.configure(desiredCaps, _.bind(function(err) {
    this.desiredCapabilities = desiredCaps;
    if (err) {
      logger.info("Got configuration error, not starting session");
      cb(err, null);
    } else {
      this.sessions[++this.counter] = { sessionId: '', callback: cb };
      this.invoke();
    }
  }, this));
};

Appium.prototype.getDeviceType = function(desiredCaps) {
  // yay for HACKS!!
  if (desiredCaps.device) {
    if (desiredCaps.device.toLowerCase().indexOf('iphone') !== -1) {
      return "ios";
    } else if (desiredCaps.device.toLowerCase().indexOf('ipad') !== -1) {
      return "ios";
    } else {
      return "android";
    }
  } else if (desiredCaps.browserName) {
    if (desiredCaps.browserName[0].toLowerCase() === "i") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase() === "safari") {
      return "ios";
    } else {
      return "android";
    }
  } else if (desiredCaps["app-package"] || this.args.androidPackage) {
    return "android";
  }
  return "ios";
};

Appium.prototype.getIosDeviceType = function(desiredCaps) {
  if (this.args.forceIphone) {
    return "iphone";
  } else if (this.args.forceIpad) {
    return "ipad";
  } else {
    var device = desiredCaps.device;
    if (typeof device !== "undefined" && device.toLowerCase().indexOf("ipad") !== -1) {
      return "ipad";
    }
  }
  return "iphone";
};

Appium.prototype.isIos = function() {
  return this.deviceType === "ios";
};

Appium.prototype.isAndroid = function() {
  return this.deviceType === "android";
};

Appium.prototype.getAppExt = function() {
  return this.isIos() ? ".app" : ".apk";
};

Appium.prototype.configure = function(desiredCaps, cb) {
  var hasAppInCaps = (typeof desiredCaps !== "undefined" &&
                      typeof desiredCaps.app !== "undefined" &&
                      desiredCaps.app);
  this.deviceType = this.getDeviceType(desiredCaps);
  if (this.isIos()) {
    this.iosDeviceType = this.getIosDeviceType(desiredCaps);
  }
  this.args.androidPackage = desiredCaps["app-package"] || this.args.androidPackage;
  this.args.androidActivity = desiredCaps["app-activity"] || this.args.androidActivity;
  if (hasAppInCaps) {
    if (desiredCaps.app[0] === "/") {
      var appPath = desiredCaps.app
        , ext = appPath.substring(appPath.length - 4);
      if (ext === this.getAppExt()) {
        this.args.app = desiredCaps.app;
        logger.info("Using local app from desiredCaps: " + appPath);
        cb(null);
      } else if (ext === ".zip") {
        logger.info("Using local zip from desiredCaps: " + appPath);
        try {
          this.unzipLocalApp(appPath, _.bind(function(zipErr, newAppPath) {
            if (zipErr) {
              cb(zipErr);
            } else {
              this.args.app = newAppPath;
              logger.info("Using locally extracted app: " + this.args.app);
              cb(null);
            }
          }, this));
        } catch(e) {
          var err = e.toString();
          logger.error("Failed copying and unzipping local app: " + appPath);
          cb(err);
        }
      } else {
        logger.error("Using local app, but didn't end in .zip or .app/.apk");
        cb("Your app didn't end in .app/.apk or .zip!");
      }
    } else if (desiredCaps.app.substring(0, 4) === "http") {
      var appUrl = desiredCaps.app;
      if (appUrl.substring(appUrl.length - 4) === ".zip") {
        try {
          this.downloadAndUnzipApp(appUrl, _.bind(function(zipErr, appPath) {
            if (zipErr) {
              cb(zipErr);
            } else {
              this.args.app = appPath;
              logger.info("Using extracted app: " + this.args.app);
              cb(null);
            }
          }, this));
          logger.info("Using downloadable app from desiredCaps: " + appUrl);
        } catch (e) {
          var err = e.toString();
          logger.error("Failed downloading app from appUrl " + appUrl);
          cb(err);
        }
      } else {
        cb("App URL (" + appUrl + ") didn't seem to end in .zip");
      }
    } else if (this.isIos() && desiredCaps.app.toLowerCase() === "safari") {
      this.args.safari = true;
      this.configureSafari(desiredCaps, cb);
    } else if (!this.args.app) {
      cb("Bad app passed in through desiredCaps: " + desiredCaps.app +
         ". Apps need to be absolute local path or URL to zip file");
    } else {
      logger.warn("Got bad app through desiredCaps: " + desiredCaps.app);
      logger.warn("Sticking with default app: " + this.args.app);
      cb(null);
    }
  } else if (this.args.safari === true) {
    this.configureSafari(desiredCaps, cb);
  } else if (!this.args.app) {
    cb("No app set; either start appium with --app or pass in an 'app' " +
       "value in desired capabilities");
  } else {
    logger.info("Using app from command line: " + this.args.app);
    cb(null);
  }
};

Appium.prototype.configureSafari = function(desiredCaps, cb) {
  var safariVer = "6.0";
  if (typeof desiredCaps.version !== "undefined") {
    safariVer = desiredCaps.version;
  }
  logger.info("Trying to use mobile safari, version " + safariVer);
  checkSafari(safariVer, _.bind(function(err, attemptedApp) {
    if (err) {
      logger.warn("Could not find mobile safari: " + err);
      cb(err);
    } else {
      logger.info("Using mobile safari app at " + attemptedApp);
      this.args.app = attemptedApp;
      cb(null);
    }
  }, this));
};

Appium.prototype.downloadAndUnzipApp = function(appUrl, cb) {
  var me = this;
  downloadFile(appUrl, function(zipPath) {
    me.unzipApp(zipPath, cb);
  });
};

Appium.prototype.unzipLocalApp = function(localZipPath, cb) {
  var me = this;
  copyLocalZip(localZipPath, function(zipPath) {
    me.unzipApp(zipPath, cb);
  });
};

Appium.prototype.unzipApp = function(zipPath, cb) {
  this.tempFiles.push(zipPath);
  var me = this;
  unzipApp(zipPath, me.getAppExt(), function(err, appPath) {
    if (err) {
      cb(err, null);
    } else {
      me.tempFiles.push(appPath);
      cb(null, appPath);
    }
  });
};

Appium.prototype.invoke = function() {
  var me = this;

  if (this.progress >= this.counter) {
    return;
  }

  if (this.sessionId === null) {
    this.sessionId = UUID.create().hex;
    logger.info('Creating new appium session ' + this.sessionId);

    if (typeof this.devices[this.deviceType] === 'undefined') {
      if (this.isIos()) {
        var iosOpts = {
          rest: this.rest
          , app: this.args.app
          , udid: this.args.udid
          , verbose: this.args.verbose
          , removeTraceDir: !this.args.keepArtifacts
          , warp: this.args.warp
          , withoutDelay: this.args.withoutDelay
          , reset: !this.args.noReset
          , autoWebview: this.args.safari
          , deviceType: this.iosDeviceType
        };
        this.devices[this.deviceType] = ios(iosOpts);
      } else if (this.isAndroid()) {
        var androidOpts = {
          rest: this.rest
          , apkPath: this.args.app
          , verbose: this.args.verbose
          , appPackage: this.args.androidPackage
          , appActivity: this.args.androidActivity
          , reset: !this.args.noReset
          , fastReset: this.args.fastReset
          , skipInstall: this.args.skipAndroidInstall
        };
        this.devices[this.deviceType] = android(androidOpts);
      } else {
        throw new Error("Tried to start a device that doesn't exist: " +
                        this.deviceType);
      }
    }
    this.device = this.devices[this.deviceType];

    this.device.start(function(err) {
      me.progress++;
      me.sessions[me.progress].sessionId = me.sessionId;
      me.sessions[me.progress].callback(err, me.device);
      if (err) {
        me.onDeviceDie(1);
      }
    }, _.bind(me.onDeviceDie, me));
  }
};

Appium.prototype.onDeviceDie = function(code, cb) {
  var dyingSession = this.sessionId;
  this.sessionId = null;
  // reset app to whatever it was before this session so we don't accidentally
  // reuse a bad app
  this.args.app = this.origApp;
  if (code !== null) {
    logger.info('Clearing out appium devices');
    this.devices = [];
    this.device = null;
    //logger.info(this.progress + " sessions.deviceType =" + this.sessions.length);
    this.sessions[this.progress] = {};
  } else {
    logger.info('Not clearing out appium devices');
  }
  if (cb) {
    cb(null, {status: status.codes.Success.code, value: null,
              sessionId: dyingSession});
  }
  // call invoke again in case we have sessions queued
  this.invoke();
};

Appium.prototype.stop = function(cb) {
  if (this.sessionId === null || this.device === null) {
    logger.info("Trying to stop appium but there's no session, doing nothing");
    return cb();
  }

  var me = this;

  logger.info('Shutting down appium session...');
  this.device.stop(function(code) {
    me.onDeviceDie(code, cb);
  });
};


Appium.prototype.reset = function(cb) {
  logger.info("Resetting app mid-session");
  if (this.isIos() || !this.fastReset) {
    var me = this
    , oldId = this.sessionId;

    this.stop(function() {
      logger.info("Restarting app");
      me.start(me.desiredCapabilities, function() {
        me.sessionId = oldId;
        cb(null, {status: status.codes.Success.code, value: null});
      });
    });
  } else { // fast reset
    logger.info("Android fast reset");
    this.device.fastReset(function(err){
      if (err) {
        cb(null, {status: status.codes.UnknownError.code, value: null});
      } else {
        cb(null, {status: status.codes.Success.code, value: null});
      }
    });
  }
};

module.exports = function(args) {
  return new Appium(args);
};
