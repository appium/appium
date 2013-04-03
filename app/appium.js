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
  , cleanSafari = helpers.cleanSafari
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
    this.start(caps, function(err) {
      if (err) {
        cb(err, null);
      } else {
        me.preLaunched = true;
        cb(null, me);
      }
    });
  }
};

Appium.prototype.start = function(desiredCaps, cb) {
  this.origApp = this.args.app;
  this.desiredCapabilities = desiredCaps;
  this.configure(desiredCaps, _.bind(function(err) {
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
  this.args.androidWaitActivity = desiredCaps["app-wait-activity"] || this.args.androidActivity;
  this.args.androidDeviceReadyTimeout = desiredCaps["device-ready-timeout"] || this.args.androidDeviceReadyTimeout;
  if (hasAppInCaps || this.args.app) {
    var appPath = (hasAppInCaps ? desiredCaps.app : this.args.app)
      , origin = (hasAppInCaps ? "desiredCaps" : "command line")
      , ext = appPath.substring(appPath.length - 4);
    if (appPath[0] === "/") {
      if (ext === this.getAppExt()) {
        this.args.app = appPath;
        logger.info("Using local app from " + origin + ": " + appPath);
        cb(null);
      } else if (ext === ".zip") {
        logger.info("Using local zip from " + origin + ": " + appPath);
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
    } else if (appPath.substring(0, 4) === "http") {
      var appUrl = appPath;
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
          logger.info("Using downloadable app from " + origin + ": " + appUrl);
        } catch (e) {
          var err = e.toString();
          logger.error("Failed downloading app from appUrl " + appUrl);
          cb(err);
        }
      } else {
        cb("App URL (" + appUrl + ") didn't seem to end in .zip");
      }
    } else if (this.isIos() && appPath.toLowerCase() === "safari") {
      this.configureSafari(desiredCaps, cb);
    } else if (this.isIos() && /([a-zA-Z0-9]+\.[a-zA-Z0-9]+)+/.exec(appPath)) {
      // we have a bundle ID
      this.args.bundleId = appPath;
      this.args.app = null;
      cb(null);
    } else {
      cb("Bad app passed in through " + origin + ": " + appPath +
         ". Apps need to be absolute local path or URL to zip file");
    }
  } else if (this.args.safari === true) {
    this.configureSafari(desiredCaps, cb);
  } else {
    cb("No app set; either start appium with --app or pass in an 'app' " +
       "value in desired capabilities");
  }
};

Appium.prototype.configureSafari = function(desiredCaps, cb) {
  this.desiredCapabilities.safari = true;
  var safariVer = "6.0";
  var usingDefaultVer = true;
  if (typeof desiredCaps.version !== "undefined") {
    safariVer = desiredCaps.version;
    usingDefaultVer = false;
  }
  logger.info("Trying to use mobile safari, version " + safariVer);
  var checkSuccess = _.bind(function(attemptedApp) {
    logger.info("Using mobile safari app at " + attemptedApp);
    this.args.app = attemptedApp;
    cleanSafariNext();
  }, this);
  var cleanSafariNext = function() {
    logger.info("Cleaning mobile safari data files");
    cleanSafari(safariVer, function(err) {
      if (err) {
        logger.error(err.message);
        cb(err);
      } else {
        cb(null);
      }
    });
  };

  checkSafari(safariVer, _.bind(function(err, attemptedApp) {
    if (err) {
      logger.warn("Could not find mobile safari with version '" + safariVer +
                  "': " + err);
      if (usingDefaultVer) {
        safariVer = "6.1";
        logger.info("Retrying with safari ver " + safariVer);
        checkSafari(safariVer, _.bind(function(err, attemptedApp) {
          if (err) {
            logger.warn("Could not find this one either: " + err);
            cb(err);
          } else {
            checkSuccess(attemptedApp);
          }
        }, this));
      } else {
        cb(err);
      }
    } else {
      checkSuccess(attemptedApp);
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
          , bundleId: this.args.bundleId
          , udid: this.args.udid
          , verbose: this.args.verbose
          , removeTraceDir: !this.args.keepArtifacts
          , withoutDelay: this.args.withoutDelay
          , reset: !this.args.noReset
          , autoWebview: this.desiredCapabilities.safari
          , deviceType: this.iosDeviceType
          , startingOrientation: this.desiredCapabilities.deviceOrientation || this.args.orientation
        };
        this.devices[this.deviceType] = ios(iosOpts);
      } else if (this.isAndroid()) {
        var androidOpts = {
          rest: this.rest
          , apkPath: this.args.app
          , verbose: this.args.verbose
          , udid: this.args.udid
          , appPackage: this.args.androidPackage
          , appActivity: this.args.androidActivity
          , appWaitActivity: this.args.androidWaitActivity
          , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
          , reset: !this.args.noReset
          , fastReset: this.args.fastReset
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
      // Ensure we don't use an undefined session.
      if (typeof me.sessions[me.progress] === 'undefined') {
        me.progress--;
        return;
      }

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
  this.args.bundleId = null;
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
