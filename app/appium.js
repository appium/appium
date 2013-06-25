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
  , selendroid = require('./selendroid')
  , firefoxOs = require('./firefoxos')
  , status = require("./uiauto/lib/status")
  , helpers = require('./helpers')
  , isWindows = helpers.isWindows();

var Appium = function(args) {
  this.args = args;
  if (this.args.quiet) {
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
  this.webSocket = null;
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
  this.fastReset = !this.args.fullReset && !this.args.noReset;
  this.sessionOverride = !this.args.noSessionOverride;
  this.resetting = false;
};

Appium.prototype.attachTo = function(rest, cb) {
  this.rest = rest;

  // Import the routing rules
  routing(this);

  if (cb) {
    cb();
  }
};

Appium.prototype.attachSocket = function(webSocket, cb) {
  this.webSocket = webSocket;

  if (cb) {
    cb();
  }
};

Appium.prototype.registerConfig = function(configObj) {
  this.serverConfig = configObj;
};

Appium.prototype.preLaunch = function(cb) {
  logger.info("Pre-launching app");
  var caps = {};
  this.start(caps, _.bind(function(err) {
    if (err) {
      cb(err, null);
    } else {
      this.preLaunched = true;
      cb(null, this);
    }
  }, this));
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
      this.clearPreviousSession();
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
    } else if (desiredCaps.device.toLowerCase().indexOf('selendroid') !== -1) {
      return "selendroid";
    } else if (desiredCaps.device.toLowerCase().indexOf('firefox') !== -1) {
      return "firefoxos";
    } else if (desiredCaps.device === "mock_ios") {
      return "mock_ios";
    } else {
      return "android";
    }
  } else if (desiredCaps.browserName) {
    if (desiredCaps.browserName[0].toLowerCase() === "i") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase() === "safari") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase().indexOf('selendroid') !== -1) {
      return "selendroid";
    } else {
      return "android";
    }
  } else if (desiredCaps["app-package"] || this.args.androidPackage) {
    return "android";
  } else if (desiredCaps["app-activity"] || this.args.androidActivity) {
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

Appium.prototype.isMockIos = function() {
  return this.deviceType === "mock_ios";
};

Appium.prototype.isIos = function() {
  return this.deviceType === "ios";
};

Appium.prototype.isAndroid = function() {
  return this.deviceType === "android";
};

Appium.prototype.isSelendroid = function() {
  return this.deviceType === "selendroid";
};

Appium.prototype.isFirefoxOS = function() {
  return this.deviceType === "firefoxos";
};

Appium.prototype.getAppExt = function() {
  return this.isIos() ? ".app" : ".apk";
};

Appium.prototype.setAndroidArgs = function(desiredCaps) {
  var setArgFromCaps = _.bind(function(arg, cap) {
    this.args[arg] = desiredCaps[cap] || this.args[arg];
  }, this);
  setArgFromCaps("androidPackage", "app-package");
  setArgFromCaps("androidActivity", "app-activity");
  setArgFromCaps("androidWaitActivity", "app-wait-activity");
  setArgFromCaps("androidDeviceReadyTimeout", "device-ready-timeout");
};

Appium.prototype.configure = function(desiredCaps, cb) {
  var hasAppInCaps = (typeof desiredCaps !== "undefined" &&
                      typeof desiredCaps.app !== "undefined" &&
                      desiredCaps.app);
  this.deviceType = this.getDeviceType(desiredCaps);
  if (this.isMockIos()) {
    return cb();
  }
  if (this.isIos()) {
    this.iosDeviceType = this.getIosDeviceType(desiredCaps);
  }
  if (!_.has(this.serverConfig, this.deviceType)) {
    logger.error("Trying to run a session for device " + this.deviceType + " " +
                 "but that device hasn't been configured. Run config");
    return cb(new Error("Device " + this.deviceType + " not configured yet"));
  }
  if (this.isAndroid() || this.isSelendroid()) {
    this.setAndroidArgs(desiredCaps);
  }
  if (hasAppInCaps || this.args.app) {
    this.configureApp(desiredCaps, hasAppInCaps, cb);
  } else if (this.isAndroid() && this.args.androidPackage) {
    // we're launching a pre-installed app by package
    if (!this.args.androidActivity) {
      return cb(new Error("app-activity is not set! It needs to be to start app"));
    }
    this.args.app = null;
    logger.info("Didn't get app but did get Android package, will attempt to " +
                "launch it on the device");
    cb(null);
  } else if (this.args.safari === true) {
    this.configureSafari(desiredCaps, cb);
  } else {
    cb("No app set; either start appium with --app or pass in an 'app' " +
       "value in desired capabilities");
  }
};

Appium.prototype.configureApp = function(desiredCaps, hasAppInCaps, cb) {
  var appPath = (hasAppInCaps ? desiredCaps.app : this.args.app)
    , isPackageOrBundle = /^([a-zA-Z0-9]+\.[a-zA-Z0-9]+)+$/.test(appPath)
    , origin = (hasAppInCaps ? "desiredCaps" : "command line");

  if (appPath[0] === "/" || (isWindows && appPath!== null && appPath.length > 2 && appPath[1] === ":" && appPath[2] === "\\") ) {
    this.configureLocalApp(appPath, origin, cb);
  } else if (appPath.substring(0, 4) === "http") {
    this.configureDownloadedApp(appPath, origin, cb);
  } else if (this.isIos() && appPath.toLowerCase() === "safari") {
    this.configureSafari(desiredCaps, cb);
  } else if (this.isIos() && isPackageOrBundle) {
    // we have a bundle ID
    logger.info("App is an iOS bundle, will attempt to run as pre-existing");
    this.args.bundleId = appPath;
    this.args.app = null;
    cb(null);
  } else if (this.isAndroid() && isPackageOrBundle) {
    // we have a package instead of app
    this.args.androidPackage = appPath;
    this.args.app = null;
    if (!this.args.androidActivity) {
      return cb(new Error("app-activity is not set! It needs to be to start app"));
    }
    logger.info("App is an Android package, will attempt to run on device");
    cb(null);
  } else if (this.isFirefoxOS()) {
    this.args.app = desiredCaps.app;
    cb(null);
  } else {
    cb("Bad app passed in through " + origin + ": " + appPath +
        ". Apps need to be absolute local path or URL to zip file");
  }
};

Appium.prototype.configureLocalApp = function(appPath, origin, cb) {
  var ext = appPath.substring(appPath.length - 4);
  if (ext === this.getAppExt()) {
    this.args.app = appPath;
    logger.info("Using local app from " + origin + ": " + appPath);
    cb(null);
  } else if (ext === ".zip") {
    logger.info("Using local zip from " + origin + ": " + appPath);
    this.unzipLocalApp(appPath, _.bind(function(zipErr, newAppPath) {
      if (zipErr) return cb(zipErr);
      this.args.app = newAppPath;
      logger.info("Using locally extracted app: " + this.args.app);
      cb(null);
    }, this));
  } else {
    var dExt = this.getAppExt();
    logger.error("Using local app, but didn't end in .zip or " + dExt);
    cb("Your app didn't end in .zip or " + dExt);
  }
};

Appium.prototype.configureDownloadedApp = function(appPath, origin, cb) {
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
  try {
    copyLocalZip(localZipPath, function(err, zipPath) {
      if (err) return cb(err);
      me.unzipApp(zipPath, cb);
    });
  } catch (e) {
    logger.error("Failed copying and unzipping local app: " + localZipPath);
    cb(e);
  }
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

Appium.prototype.clearPreviousSession = function() {
  var me = this;
  if (me.sessionOverride && me.device) {
    me.device.stop(function() {
      me.devices = [];
      me.device = null;
      me.sessions[me.progress] = {};
      me.invoke();
    });
  } else {
    me.invoke();
  }
};

Appium.prototype.invoke = function() {
  var me = this;

  if (this.progress >= this.counter) {
    return;
  }

  if (this.sessionOverride || this.sessionId === null) {
    this.sessionId = UUID.create().hex;
    logger.info('Creating new appium session ' + this.sessionId);

    if (typeof this.devices[this.deviceType] === 'undefined') {
      if (this.isMockIos()) {
        var device = ios({rest: this.rest});
        device.start = function(cb) { cb(); };
        device.stop = function(cb) { cb(); };
        this.devices[this.deviceType] = device;
      } else if (this.isIos()) {
        var iosOpts = {
          rest: this.rest
          , webSocket: this.webSocket
          , app: this.args.app
          , ipa: this.args.ipa
          , bundleId: this.args.bundleId
          , udid: this.args.udid
          , verbose: !this.args.quiet
          , removeTraceDir: !this.args.keepArtifacts
          , withoutDelay: !this.args.nativeInstrumentsLib
          , reset: !this.args.noReset
          , autoWebview: this.desiredCapabilities.safari
          , deviceType: this.iosDeviceType
          , startingOrientation: this.desiredCapabilities.deviceOrientation || this.args.orientation
          , robotPort: this.args.robotPort
          , robotAddress: this.args.robotAddress
        };
        this.devices[this.deviceType] = ios(iosOpts);
      } else if (this.isAndroid()) {
        var androidOpts = {
          rest: this.rest
          , webSocket: this.webSocket
          , apkPath: this.args.app
          , verbose: !this.args.quiet
          , udid: this.args.udid
          , appPackage: this.args.androidPackage
          , appActivity: this.args.androidActivity
          , appWaitActivity: this.args.androidWaitActivity
          , avdName: this.args.avd
          , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
          , reset: !this.args.noReset
          , fastReset: this.fastReset
          , useKeystore: this.args.useKeystore
          , keystorePath: this.args.keystorePath
          , keystorePassword: this.args.keystorePassword
          , keyAlias: this.args.keyAlias
          , keyPassword: this.args.keyPassword
        };
        this.devices[this.deviceType] = android(androidOpts);
      } else if (this.isSelendroid()) {
        var selendroidOpts = {
          apkPath: this.args.app
          , desiredCaps: this.desiredCapabilities
          , verbose: !this.args.quiet
          , udid: this.args.udid
          , appPackage: this.args.androidPackage
          , appActivity: this.args.androidActivity
          , appWaitActivity: this.args.androidWaitActivity
          , avdName: this.args.avd
          , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
          , reset: !this.args.noReset
          , port: this.args.selendroidPort
          , fastReset: this.fastReset
          , useKeystore: this.args.useKeystore
          , keystorePath: this.args.keystorePath
          , keystorePassword: this.args.keystorePassword
          , keyAlias: this.args.keyAlias
          , keyPassword: this.args.keyPassword
        };
        this.devices[this.deviceType] = selendroid(selendroidOpts);
      } else if (this.isFirefoxOS()) {
        var firefoxOpts = {
          app: this.args.app
          , desiredCaps: this.desiredCapabilities
          , verbose: !this.args.quiet
        };
        this.devices[this.deviceType] = firefoxOs(firefoxOpts);
      } else {
        throw new Error("Tried to start a device that doesn't exist: " +
                        this.deviceType);
      }
    }
    this.device = this.devices[this.deviceType];

    this.device.start(function(err, sessionIdOverride) {
      me.progress++;
      // Ensure we don't use an undefined session.
      if (typeof me.sessions[me.progress] === 'undefined') {
        me.progress--;
        return;
      }
      if (sessionIdOverride) {
        me.sessionId = sessionIdOverride;
        logger.info("Overriding session id with " + sessionIdOverride);
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
  // if we're not restarting internally, call invoke again, in case we have
  // sessions queued
  if (!this.resetting) {
    this.clearPreviousSession();
  }
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
    , oldImpWait = this.device.implicitWaitMs
    , oldId = this.sessionId;

    this.resetting = true;
    this.stop(function() {
      logger.info("Restarting app");
      me.start(me.desiredCapabilities, function() {
        me.resetting = false;
        me.device.implicitWaitMs = oldImpWait;
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
