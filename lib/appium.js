"use strict";

var routing = require('./server/routing.js')
  , path = require('path')
  , loggerjs = require('./server/logger.js')
  , logger = loggerjs.get('appium')
  , helpers = require('./helpers.js')
  , downloadFile = helpers.downloadFile
  , unzipApp = helpers.unzipApp
  , checkSafari = helpers.checkSafari
  , cleanSafari = helpers.cleanSafari
  , copyLocalZip = helpers.copyLocalZip
  , getiOSSDKVersion = helpers.getiOSSDKVersion
  , UUID = require('uuid-js')
  , _ = require('underscore')
  , fs = require('fs')
  , IOS = require('./devices/ios/ios.js')
  , Safari = require('./devices/ios/safari.js')
  , Android = require('./devices/android/android.js')
  , Selendroid = require('./devices/android/selendroid.js')
  , Chrome = require('./devices/android/chrome.js')
  , FirefoxOs = require('./devices/firefoxos/firefoxos.js')
  , status = require("./server/status.js")
  , helpers = require('./helpers.js')
  , isWindows = helpers.isWindows();

var Appium = function(args) {
  this.args = args;
  this.serverArgs = _.clone(args);
  this.rest = null;
  this.webSocket = null;
  this.deviceType = null;
  this.device = null;
  this.sessionId = null;
  this.desiredCapabilities = {};
  this.oldDesiredCapabilities = {};
  this.session = null;
  this.tempFiles = [];
  this.preLaunched = false;
  this.fastReset = !this.args.fullReset && !this.args.noReset;
  this.sessionOverride = this.args.sessionOverride;
  this.resetting = false;
  this.defCommandTimeoutMs = 60 * 1000;
  this.commandTimeoutMs = this.defCommandTimeoutMs;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
  this.isSafariLauncherApp = false;
  this.origAppPath = null;
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
  this.start(caps, function(err) {
    if (err) {
      cb(err, null);
    } else {
      this.preLaunched = true;
      cb(null, this);
    }
  }.bind(this));
};

Appium.prototype.start = function(desiredCaps, cb) {
  this.desiredCapabilities = desiredCaps;
  this.configure(desiredCaps, function(err) {
    if (err) {
      logger.info("Got configuration error, not starting session");
      this.cleanupSession();
      cb(err, null);
    } else {
      this.invoke(cb);
    }
  }.bind(this));
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
  } else if (desiredCaps.app) {
    if (desiredCaps.app.toLowerCase() === "safari") {
      return "ios";
    } else if (desiredCaps.app.toLowerCase() === "iwebview") {
      return "ios";
    } else if (desiredCaps.app.toLowerCase() === "chrome") {
      return "android";
    } else if (desiredCaps.app.toLowerCase() === "chromium") {
      return "android";
    }
  } else if (desiredCaps.browserName) {
    logger.warn("WARNING: use of browserName is deprecated. Please migrate " +
                "your tests");
    if (desiredCaps.browserName[0].toLowerCase() === "i") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase() === "safari") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase() === "iwebview") {
      return "ios";
    } else if (desiredCaps.browserName.toLowerCase() === "chrome") {
      return "android";
    } else if (desiredCaps.browserName.toLowerCase() === "chromium") {
      return "android";
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

Appium.prototype.isMockIos = function() {
  return this.deviceType === "mock_ios";
};

Appium.prototype.isIos = function() {
  return this.deviceType === "ios";
};

Appium.prototype.isAndroid = function() {
  return this.deviceType === "android";
};

Appium.prototype.isChrome = function() {
  return this.args.app === "chrome" ||
         this.args.androidPackage === "com.android.chrome" ||
         this.args.app === "chromium" ||
         this.args.androidPackage === "org.chromium.chrome.testshell";
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
  var setArgFromCaps = function(arg, cap) {
    this.args[arg] = desiredCaps[cap] || this.args[arg];
  }.bind(this);
  setArgFromCaps("androidPackage", "app-package");
  setArgFromCaps("androidActivity", "app-activity");
  setArgFromCaps("androidWaitActivity", "app-wait-activity");
  setArgFromCaps("androidDeviceReadyTimeout", "device-ready-timeout");
  setArgFromCaps("compressXml", "compressXml");
};

Appium.prototype.configure = function(desiredCaps, cb) {
  this.origAppPath = null;
  var hasAppInCaps = (typeof desiredCaps !== "undefined" &&
                      typeof desiredCaps.app !== "undefined" &&
                      desiredCaps.app);
  var app = this.args.app;
  if (hasAppInCaps) {
    app = desiredCaps.app;
  }
  this.deviceType = this.getDeviceType(desiredCaps);
  if (this.isMockIos()) {
    return cb();
  }

  if (!_.has(this.serverConfig, this.deviceType)) {
    logger.error("Trying to run a session for device " + this.deviceType + " " +
                 "but that device hasn't been configured. Run config");
    return cb(new Error("Device " + this.deviceType + " not configured yet"));
  }

  if (this.isAndroid() || this.isSelendroid()) {
      this.setAndroidArgs(desiredCaps);
      //chrome apps do not need this checking, native and normal apps do
      if (app === null || app.toLowerCase() !== "chrome") {
          if (!this.args.androidActivity) {
              return cb(new Error("You need to pass in the app-activity desired " +
                  "capability or server param"));
          }
          if (!this.args.androidPackage) {
              return cb(new Error("You need to pass in the app-package desired " +
                  "capability or server param"));
          }
      }
  }

  if (hasAppInCaps || this.args.app) {
    this.configureApp(desiredCaps, hasAppInCaps, cb);
  } else if (this.isAndroid() && this.args.androidPackage) {
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
    , isPackageOrBundle = /^([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)+$/.test(appPath)
    , origin = (hasAppInCaps ? "desiredCaps" : "command line");

  if (appPath[0] === "/" || (isWindows && appPath!== null && appPath.length > 2 && appPath[1] === ":" && appPath[2] === "\\") ) {
    this.configureLocalApp(appPath, origin, cb);
  } else if (appPath.substring(0, 4) === "http") {
    this.configureDownloadedApp(appPath, origin, cb);
  } else if (this.isIos() && appPath.toLowerCase() === "safari") {
    if (this.args.udid) {
      this.desiredCapabilities.safari = true;
      this.isSafariLauncherApp = true;
      this.configureLocalApp("./build/SafariLauncher/SafariLauncher.zip", origin, cb);
    } else {
      this.configureSafari(desiredCaps, cb);
    }
  } else if (this.isIos() && appPath.toLowerCase() === "iwebview") {
    this.desiredCapabilities.iwebview = true;
    this.configureLocalApp(path.resolve(__dirname,
          "../build/WebViewApp/WebViewApp.app"), origin, cb);
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
    logger.info("App is an Android package, will attempt to run on device");
    cb(null);
  } else if (_.contains(["chrome", "chromium"], appPath.toLowerCase())) {
    logger.info("Looks like we want chrome on android");
    if (appPath.toLowerCase() === "chromium") {
      this.args.chromium = true;
    } else {
      this.args.chromium = false;
    }
    this.configureChromeAndroid();
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
    fs.stat(appPath, function(err) {
      if (err) {
        return cb(new Error("Error locating the app: " + err.message));
      }
      cb();
    });
  } else if (ext === ".zip" || ext === ".ipa") {
    logger.info("Using local zip or ipa from " + origin + ": " + appPath);
    this.unzipLocalApp(appPath, function(zipErr, newAppPath) {
      if (zipErr) return cb(zipErr);
      this.args.app = newAppPath;
      logger.info("Using locally extracted app: " + this.args.app);
      cb(null);
    }.bind(this));
  } else {
    var dExt = this.getAppExt();
    logger.error("Using local app, but didn't end in .zip, .ipa or " + dExt);
    cb("Your app didn't end in .zip, .ipa or " + dExt);
  }
};

Appium.prototype.configureDownloadedApp = function(appPath, origin, cb) {
  var appUrl = appPath;
  if (appUrl.substring(appUrl.length - 4) === ".apk") {
    try {
      downloadFile(appUrl, function(appPath) {
        this.tempFiles.push(appPath);
        this.args.app = appPath;
        cb(null);
      }.bind(this));
    } catch (e) {
      var err = e.toString();
      logger.error("Failed downloading app from appUrl " + appUrl);
      cb(err);
    }
  } else if (appUrl.substring(appUrl.length - 4) === ".zip") {
    try {
      this.downloadAndUnzipApp(appUrl, function(zipErr, appPath) {
        if (zipErr) {
          cb(zipErr);
        } else {
          this.args.app = appPath;
          logger.info("Using extracted app: " + this.args.app);
          cb(null);
        }
      }.bind(this));
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
  var safariVer = null;
  if (typeof desiredCaps.version !== "undefined" && desiredCaps.version) {
    safariVer = desiredCaps.version;
  }
  logger.info("Trying to use mobile safari, version " + safariVer);
  var checkNext = function(attemptedApp, origApp, safariVer) {
    logger.info("Using mobile safari app at " + attemptedApp);
    this.args.app = attemptedApp;
    logger.info("Cleaning mobile safari data files");
    cleanSafari(safariVer, function(err) {
      if (err) {
        logger.error(err.message);
        cb(err);
      } else {
        this.origAppPath = origApp;
        cb(null);
      }
    }.bind(this));
  }.bind(this);
  var sdkNext = function(safariVer) {
    checkSafari(safariVer, function(err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare mobile safari with version '" +
                     safariVer + "': " + err);
        return cb(err);
      }
      checkNext(attemptedApp, origApp, safariVer);
    });
  };

  if (safariVer === null) {
    getiOSSDKVersion(function(err, safariVer) {
      if (err) return cb(err);
      sdkNext(safariVer);
    });
  } else {
    sdkNext(safariVer);
  }
};

Appium.prototype.configureSafariForLauncher = function (desiredCaps, cb) {
  this.desiredCapabilities.safari = true;
  var safariVer = "6.1";
  var usingDefaultVer = true;
  if (typeof desiredCaps.version !== "undefined") {
    safariVer = desiredCaps.version;
    usingDefaultVer = false;
  }

  cleanSafari(safariVer, function(err) {
    if (err) {
      logger.error(err.message);
      cb(err);
    } else {
      cb(null);
    }
  });
};

Appium.prototype.configureChromeAndroid = function() {
  this.deviceType = "android";
  this.args.androidPackage = "com.android.chrome";
  this.args.androidActivity = "com.google.android.apps.chrome.Main";
  this.args.app = null;
};

Appium.prototype.downloadAndUnzipApp = function(appUrl, cb) {
  downloadFile(appUrl, function(zipPath) {
    this.unzipApp(zipPath, cb);
  }.bind(this));
};

Appium.prototype.unzipLocalApp = function(localZipPath, cb) {
  try {
    copyLocalZip(localZipPath, function(err, zipPath) {
      if (err) return cb(err);
      this.unzipApp(zipPath, cb);
    }.bind(this));
  } catch (e) {
    logger.error("Failed copying and unzipping local app: " + localZipPath);
    cb(e);
  }
};

Appium.prototype.unzipApp = function(zipPath, cb) {
  this.tempFiles.push(zipPath);
  unzipApp(zipPath, this.getAppExt(), function(err, appPath) {
    if (err) {
      cb(err, null);
    } else {
      this.tempFiles.push(appPath);
      cb(null, appPath);
    }
  }.bind(this));
};

Appium.prototype.invoke = function(cb) {

  if (this.sessionOverride || this.sessionId === null) {
    this.sessionId = UUID.create().hex;
    logger.info('Creating new appium session ' + this.sessionId);

    if (this.device === null || this.sessionOverride) {
      this.initDevice();
    }

    if (_.has(this.desiredCapabilities, 'launch') &&
        this.desiredCapabilities.launch === false) {
      // if user has passed in desiredCaps.launch = false
      // meaning they will manage app install / launching
      cb(null, this.device);
    } else {
      // the normal case, where we launch the device for folks

      var onStart = function(err, sessionIdOverride) {
        if (sessionIdOverride) {
          this.sessionId = sessionIdOverride;
          logger.info("Overriding session id with " +
                      JSON.stringify(sessionIdOverride));
        }
        if (err) return this.cleanupSession(err, cb);
        logger.info("Device launched! Ready for commands (will time out in " +
                    (this.commandTimeoutMs / 1000) + "secs)");
        this.resetTimeout();
        cb(null, this.device);
      }.bind(this);

      var onDie = function() {
        // if we're using the safari launcher app, don't end the session when
        // instruments inevitably crashes out
        if (!this.isSafariLauncherApp) {
          this.cleanupSession();
        }
      }.bind(this);

      this.device.start(onStart, onDie);
    }

  } else {
    return cb(new Error("Requested a new session but one was in progress"));
  }

};

Appium.prototype.initDevice = function() {
  if (this.isMockIos()) {
    var device = new IOS({rest: this.rest});
    device.start = function(cb) { cb(); };
    device.stop = function(cb) { cb(); };
    this.device = device;
  } else if (this.isIos()) {
    var iosOpts = {
      rest: this.rest
      , webSocket: this.webSocket
      , app: this.args.app
      , ipa: this.args.ipa
      , bundleId: this.args.bundleId
      , udid: this.args.udid
      , verbose: !this.args.quiet
      , automationTraceTemplatePath: this.args.automationTraceTemplatePath
      , removeTraceDir: !this.args.keepArtifacts
      , withoutDelay: !this.args.nativeInstrumentsLib
      , reset: !this.args.noReset
      , launchTimeout: this.desiredCapabilities.launchTimeout || this.args.launchTimeout
      , version: this.desiredCapabilities.version
      , deviceName: this.desiredCapabilities.deviceName || this.desiredCapabilities.device || this.args.deviceName
      , defaultDevice: this.args.defaultDevice
      , forceiPhone: this.args.forceIphone
      , forceiPad: this.args.forceIpad
      , language: this.desiredCapabilities.language || this.args.language
      , locale: this.desiredCapabilities.locale || this.args.locale
      , calendarFormat: this.desiredCapabilities.calendarFormat || this.args.calendarFormat
      , startingOrientation: this.desiredCapabilities.deviceOrientation || this.args.orientation
      , robotPort: this.args.robotPort
      , robotAddress: this.args.robotAddress
      , isSafariLauncherApp: this.isSafariLauncherApp
      , desiredCapabilities: this.desiredCapabilities
      , logNoColors: this.args.logNoColors
      , flakeyRetries: this.args.backendRetries
      , origAppPath: this.origAppPath
    };
    if (this.desiredCapabilities.safari || this.desiredCapabilities.iwebview) {
      this.device = new Safari(iosOpts);
    } else {
      this.device = new IOS(iosOpts);
    }
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
      , compressXml: this.args.compressXml
      , avdName: this.args.avd
      , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
      , reset: !this.args.noReset
      , fastReset: this.fastReset
      , fastClear: this.desiredCapabilities.fastClear
      , useKeystore: this.args.useKeystore
      , keystorePath: this.args.keystorePath
      , keystorePassword: this.args.keystorePassword
      , keyAlias: this.args.keyAlias
      , keyPassword: this.args.keyPassword
      , systemPort: this.args.devicePort
      , desiredCapabilities: this.desiredCapabilities
      , logNoColors: this.args.logNoColors
    };
    if (this.isChrome()) {
      androidOpts.chromium = this.args.chromium;
      this.device = new Chrome(androidOpts);
    } else {
      this.device = new Android(androidOpts);
    }
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
      , systemPort: this.args.selendroidPort
      , fastReset: this.fastReset
      , useKeystore: this.args.useKeystore
      , keystorePath: this.args.keystorePath
      , keystorePassword: this.args.keystorePassword
      , keyAlias: this.args.keyAlias
      , keyPassword: this.args.keyPassword
    };
    this.device = new Selendroid(selendroidOpts);
  } else if (this.isFirefoxOS()) {
    var firefoxOpts = {
      app: this.args.app
      , desiredCaps: this.desiredCapabilities
      , verbose: !this.args.quiet
    };
    this.device = new FirefoxOs(firefoxOpts);
  } else {
    throw new Error("Tried to start a device that doesn't exist: " +
                    this.deviceType);
  }
};

Appium.prototype.timeoutWaitingForCommand = function() {
  logger.info("Didn't get a new command in " + (this.commandTimeoutMs / 1000) +
              " secs, shutting down...");
  this.stop(function() {
    logger.info("We shut down because no new commands came in");
  }.bind(this));
};

Appium.prototype.cleanupSession = function(err, cb) {
  logger.info("Cleaning up appium session");
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  this.commandTimeoutMs = this.defCommandTimeoutMs;
  var dyingSession = this.sessionId;
  this.sessionId = null;
  this.device = null;
  this.args = _.clone(this.serverArgs);
  this.oldDesiredCapabilities = _.clone(this.desiredCapabilities);
  this.desiredCapabilities = {};
  if (cb) {
    if (err) return cb(err);
    cb(null, {status: status.codes.Success.code, value: null,
      sessionId: dyingSession});
  }
};

Appium.prototype.resetTimeout = function() {
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  if (this.commandTimeoutMs && this.commandTimeoutMs > 0) {
    this.commandTimeout = setTimeout(this.timeoutWaitingForCommand.bind(this),
      this.commandTimeoutMs);
  }
};

Appium.prototype.setCommandTimeout = function(secs, cb) {
  logger.info("Setting command timeout to " + secs + " secs");
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeoutMs = secs * 1000;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: secs
  });
};

Appium.prototype.resetCommandTimeout = function(cb) {
  this.commandTimeoutMs = this.origCommandTimeoutMs;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: ''
  });
};

Appium.prototype.getCommandTimeout = function(cb) {
  cb(null, {
    status: status.codes.Success.code
    , value: this.commandTimeoutMs / 1000
  });
};

Appium.prototype.stop = function(cb) {
  if (this.sessionId === null || this.device === null) {
    logger.info("Trying to stop appium but there's no session, doing nothing");
    return cb();
  }

  logger.info('Shutting down appium session...');
  if (this.isSafariLauncherApp === true) {
    this.device.closeWindow(function() {
      if (this.device.udid === null && this.device.instruments !== null) {
        this.device.instruments.shutdown(function() {
          this.cleanupSession(null, cb);
        }.bind(this));
       } else {
         this.cleanupSession(null, cb);
       }
    }.bind(this));
  } else {
    this.device.stop(function(code) {
      var err;
      if (code && code > 0) {
        err = new Error("Device exited with code: " + code);
      }
      this.cleanupSession(err, cb);
    }.bind(this));
  }
};


Appium.prototype.reset = function(cb) {
  logger.info("Resetting app mid-session");
  if ((this.isIos() && !this.device.instruments.udid) || !this.fastReset) {
    var oldImpWait = this.device.implicitWaitMs
      , oldCommandTimeout = this.commandTimeoutMs
      , oldId = this.sessionId;

    this.resetting = true;
    this.stop(function() {
      logger.info("Restarting app");
      this.start(this.oldDesiredCapabilities, function(err) {
        if (err) return cb(err);
        this.resetting = false;
        this.device.implicitWaitMs = oldImpWait;
        this.sessionId = oldId;
        this.setCommandTimeout(oldCommandTimeout / 1000, function() {
          cb(null, {status: status.codes.Success.code, value: null});
        });
      }.bind(this));
    }.bind(this));
  } else { // Android fast reset
    if (this.isIos()) { // physical iOS
      cb(null, {status: status.codes.Success.code, value: null});
    } else {
      logger.info("Android fast reset");
      this.device.fastReset(function(err){
        if (err) {
          cb(null, {status: status.codes.UnknownError.code, value: null});
        } else {
          cb(null, {status: status.codes.Success.code, value: null});
        }
      });
    }
  }
};

module.exports = function(args) {
  return new Appium(args);
};
