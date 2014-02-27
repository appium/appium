"use strict";

var routing = require('./server/routing.js')
  , loggerjs = require('./server/logger.js')
  , logger = loggerjs.get('appium')
  , UUID = require('uuid-js')
  , _ = require('underscore')
  , IOS = require('./devices/ios/ios.js')
  , Safari = require('./devices/ios/safari.js')
  , Android = require('./devices/android/android.js')
  , Selendroid = require('./devices/android/selendroid.js')
  , Chrome = require('./devices/android/chrome.js')
  , FirefoxOs = require('./devices/firefoxos/firefoxos.js')
  , status = require("./server/status.js");

var Appium = function (args) {
  this.args = args;
  this.serverArgs = _.clone(args);
  this.rest = null;
  this.args.webSocket = null;
  this.deviceType = null;
  this.device = null;
  this.sessionId = null;
  this.desiredCapabilities = {};
  this.oldDesiredCapabilities = {};
  this.session = null;
  this.tempFiles = [];
  this.preLaunched = false;
  this.fullReset = this.args.fullReset;
  this.fastReset = !this.args.fullReset && !this.args.noReset;
  this.sessionOverride = this.args.sessionOverride;
  this.resetting = false;
  this.defCommandTimeoutMs = 60 * 1000;
  this.commandTimeoutMs = this.defCommandTimeoutMs;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
  this.origAppPath = null;
};

Appium.prototype.attachTo = function (rest) {
  this.rest = rest;
  routing(this);
};

Appium.prototype.attachSocket = function (webSocket) {
  this.args.webSocket = webSocket;
};

Appium.prototype.registerConfig = function (configObj) {
  this.serverConfig = configObj;
};

Appium.prototype.preLaunch = function (cb) {
  logger.info("Pre-launching app");
  var caps = {};
  this.start(caps, function (err) {
    if (err) {
      cb(err, null);
    } else {
      this.preLaunched = true;
      cb(null, this);
    }
  }.bind(this));
};

Appium.prototype.start = function (desiredCaps, cb) {
  this.desiredCapabilities = desiredCaps;
  this.configure(this.args, desiredCaps, function (err) {
    if (err) {
      logger.info("Got configuration error, not starting session");
      this.cleanupSession();
      cb(err, null);
    } else {
      this.invoke(cb);
    }
  }.bind(this));
};

Appium.prototype.getDeviceType = function (args, desiredCaps) {

  var errMsg = "A valid device type is required in the capabilities list";

  if (args.safari) {
    return "ios";
  } else if (args.forceIphone) {
    return "ios";
  } else if (args.forceIpad) {
    return "ios";
  }

  if (desiredCaps.device) {
    if (desiredCaps.device.toLowerCase().indexOf('iphone') !== -1) {
      return "ios";
    } else if (desiredCaps.device.toLowerCase().indexOf('ipad') !== -1) {
      return "ios";
    } else if (desiredCaps.device.toLowerCase().indexOf('selendroid') !== -1) {
      return "selendroid";
    } else if (desiredCaps.device.toLowerCase().indexOf('firefox') !== -1) {
      return "firefoxos";
    } else if (desiredCaps.device.toLowerCase().indexOf('android') !== -1) {
      return "android";
    } else if (desiredCaps.device === "mock_ios") {
      return "mock_ios";
    }
  }

  throw new Error(errMsg);
};

Appium.prototype.getDeviceTypeFromApp = function (app) {
  if (this.args.ipa) {
    return "ios";
  } else if (this.args.androidPackage || this.args.avd) {
    return "android";
  } else if (/\.app/.test(app)) {
    return "ios";
  } else if (/\.apk/.test(app)) {
    return "android";
  } else if ((app && app.toLowerCase() === "safari") || this.args.safari) {
    return "ios";
  } else if ((app && app.toLowerCase() === "settings")) {
    return "ios";
  }
  throw new Error("Could not determine your device type from --app");
};

Appium.prototype.isMockIos = function () {
  return this.deviceType === "mock_ios";
};

Appium.prototype.isIos = function () {
  return this.deviceType === "ios";
};

Appium.prototype.isAndroid = function () {
  return this.deviceType === "android";
};

Appium.prototype.isChrome = function (args, caps) {
  var checkApp = function (app) {
    return args.app === app || caps.app === app;
  };
  var checkPackage = function (pkg) {
    return args.androidPackage === pkg ||
           caps["app-package"] === pkg;
  };
  return checkApp("chrome") ||
         checkPackage("com.android.chrome") ||
         checkApp("chromium") ||
         checkPackage("org.chromium.chrome.testshell") ||
         checkApp("browser") ||
         checkPackage("com.android.browser");
};

Appium.prototype.isSelendroid = function () {
  return this.deviceType === "selendroid";
};

Appium.prototype.isFirefoxOS = function () {
  return this.deviceType === "firefoxos";
};

Appium.prototype.getAppExt = function () {
  return this.isIos() ? ".app" : ".apk";
};

Appium.prototype.configure = function (args, desiredCaps, cb) {
  this.origAppPath = null;
  var deviceType;
  try {
    if (args.launch) {
      deviceType = this.getDeviceTypeFromApp(args.app);
    } else {
      deviceType = this.getDeviceType(desiredCaps);
    }
  } catch (e) {
    logger.error(e.message);
    return cb(e);
  }

  if (!_.has(this.serverConfig, deviceType)) {
    logger.error("Trying to run a session for device " + deviceType + " " +
                 "but that device hasn't been configured. Run config");
    return cb(new Error("Device " + deviceType + " not configured yet"));
  }
  this.device = this.getDevice(deviceType);
  var capOverrides = [
    "app"
  , "launchTimeout"
  ];
  _.each(capOverrides, function (cap) {
    args[cap] = desiredCaps[cap] || args[cap];
  }.bind(this));
  this.device.configure(args, desiredCaps, cb);
};

Appium.prototype.invoke = function (cb) {

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

      var onStart = function (err, sessionIdOverride) {
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

      var onDie = function () {
        // if we're using the safari launcher app, don't end the session when
        // instruments inevitably crashes out
        if (this.device.dontCleanupSession) {
          this.cleanupSession();
        }
      }.bind(this);

      this.device.start(onStart, onDie);
    }

  } else {
    return cb(new Error("Requested a new session but one was in progress"));
  }

};

Appium.prototype.getDevice = function (deviceType) {
  var caps = this.desiredCapabilities;
  var Device = (function () {
    switch (deviceType) {
      case "ios":
        return (caps.safari || caps.iwebview) ? Safari : IOS;
      case "android":
        return this.isChrome(this.args, caps) ? Chrome : Android;
      case "selendroid":
        return Selendroid;
      case "firefoxos":
        return FirefoxOs;
      default:
        throw new Error("Tried to start a device that doesn't exist: " +
                        deviceType);
    }
  });
  return new Device();

  if (deviceType === "ios") {

    var iosOpts = {
      rest: this.rest
    , webSocket: this.webSocket
    , app: this.args.app
    , ipa: this.args.ipa
    , bundleId: this.args.bundleId || this.desiredCapabilities.bundleId
    , udid: this.args.udid
    , fullReset: this.fullReset
    , verbose: !this.args.quiet
    , automationTraceTemplatePath: this.args.automationTraceTemplatePath
    , removeTraceDir: !this.args.keepArtifacts
    , withoutDelay: !(typeof this.desiredCapabilities.nativeInstrumentsLib !== 'undefined' ?
      this.desiredCapabilities.nativeInstrumentsLib : this.args.nativeInstrumentsLib)
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
    , showSimulatorLog: this.args.showSimulatorLog
    , robotPort: this.args.robotPort
    , robotAddress: this.args.robotAddress
    , isSafariLauncherApp: this.isSafariLauncherApp
    , desiredCapabilities: this.desiredCapabilities
    , logNoColors: this.args.logNoColors
    , flakeyRetries: this.args.backendRetries
    , origAppPath: this.origAppPath
    , autoAcceptAlerts: this.desiredCapabilities.autoAcceptAlerts
    , keepKeyChains: this.args.keepKeyChains || this.desiredCapabilities.keepKeyChains
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
    , appWaitPackage: this.args.androidWaitPackage
    , appWaitActivity: this.args.androidWaitActivity
    , androidCoverage: this.args.androidCoverage
    , compressXml: this.args.compressXml
    , avdName: this.args.avd
    , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
    , reset: !this.args.noReset
    , fastReset: this.fastReset
    , fastClear: this.desiredCapabilities.fastClear
    , fullReset: this.fullReset
    , useKeystore: this.args.useKeystore
    , keystorePath: this.args.keystorePath
    , keystorePassword: this.args.keystorePassword
    , keyAlias: this.args.keyAlias
    , keyPassword: this.args.keyPassword
    , systemPort: this.args.devicePort
    , desiredCapabilities: this.desiredCapabilities
    , logNoColors: this.args.logNoColors
    , port: this.args.chromeDriverPort
    };
    if (this.isChrome()) {
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
    , appWaitPackage: this.args.androidWaitPackage
    , appWaitActivity: this.args.androidWaitActivity
    , avdName: this.args.avd
    , appDeviceReadyTimeout: this.args.androidDeviceReadyTimeout
    , reset: !this.args.noReset
    , systemPort: this.args.selendroidPort
    , fastReset: this.fastReset
    , fullReset: this.fullReset
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

Appium.prototype.timeoutWaitingForCommand = function () {
  logger.info("Didn't get a new command in " + (this.commandTimeoutMs / 1000) +
              " secs, shutting down...");
  this.stop(function () {
    logger.info("We shut down because no new commands came in");
  }.bind(this));
};

Appium.prototype.cleanupSession = function (err, cb) {
  logger.info("Cleaning up appium session");
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  this.commandTimeoutMs = this.defCommandTimeoutMs;
  var dyingSession = this.sessionId;
  this.sessionId = null;
  this.sessionOverride = false;
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

Appium.prototype.resetTimeout = function () {
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  if (this.commandTimeoutMs && this.commandTimeoutMs > 0) {
    this.commandTimeout = setTimeout(this.timeoutWaitingForCommand.bind(this),
      this.commandTimeoutMs);
  }
};

Appium.prototype.setCommandTimeout = function (secs, cb) {
  logger.info("Setting command timeout to " + secs + " secs");
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeoutMs = secs * 1000;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
  , value: secs
  });
};

Appium.prototype.resetCommandTimeout = function (cb) {
  this.commandTimeoutMs = this.origCommandTimeoutMs;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
  , value: ''
  });
};

Appium.prototype.getCommandTimeout = function (cb) {
  cb(null, {
    status: status.codes.Success.code
  , value: this.commandTimeoutMs / 1000
  });
};

Appium.prototype.stop = function (cb) {
  if (this.sessionId === null || this.device === null) {
    logger.info("Trying to stop appium but there's no session, doing nothing");
    return cb();
  }

  logger.info('Shutting down appium session...');
  // TODO get this out of appium.js
  if (this.isSafariLauncherApp === true) {
    syntasdfasdf
    this.device.closeWindow(function () {
      if (this.device.udid === null && this.device.instruments !== null) {
        this.device.instruments.shutdown(function () {
          this.cleanupSession(null, cb);
        }.bind(this));
      } else {
        this.cleanupSession(null, cb);
      }
    }.bind(this));
  } else {
    this.device.stop(function (code) {
      var err;
      if (code && code > 0) {
        err = new Error("Device exited with code: " + code);
      }
      this.cleanupSession(err, cb);
    }.bind(this));
  }
};


Appium.prototype.reset = function (cb) {
  logger.info("Resetting app mid-session");
  if ((this.isIos() && !this.device.instruments.udid) || !this.fastReset) {
    var oldImpWait = this.device.implicitWaitMs
      , oldCommandTimeout = this.commandTimeoutMs
      , oldId = this.sessionId;

    this.resetting = true;
    this.stop(function () {
      logger.info("Restarting app");
      this.start(this.oldDesiredCapabilities, function (err) {
        if (err) return cb(err);
        this.resetting = false;
        this.device.implicitWaitMs = oldImpWait;
        this.sessionId = oldId;
        this.setCommandTimeout(oldCommandTimeout / 1000, function () {
          cb(null, {status: status.codes.Success.code, value: null});
        });
      }.bind(this));
    }.bind(this));
  } else { // Android fast reset
    if (this.isIos()) { // physical iOS
      cb(null, {status: status.codes.Success.code, value: null});
    } else {
      logger.info("Android fast reset");
      this.device.fastReset(function (err) {
        if (err) {
          cb(null, {status: status.codes.UnknownError.code, value: err.message});
        } else {
          cb(null, {status: status.codes.Success.code, value: null});
        }
      });
    }
  }
};

module.exports = function (args) {
  return new Appium(args);
};
