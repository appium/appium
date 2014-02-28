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

var DT_IOS = "ios"
  , DT_ANDROID = "android"
  , DT_SELENDROID = "selendroid"
  , DT_MOCK_IOS = "mock_ios"
  , DT_FIREFOX_OS = "firefoxos";

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
  this.preLaunched = false;
  this.fastReset = !this.args.fullReset && !this.args.noReset;
  this.args.fastReset = this.fastReset;
  this.sessionOverride = this.args.sessionOverride;
  this.resetting = false;
  this.defCommandTimeoutMs = 60 * 1000;
  this.commandTimeoutMs = this.defCommandTimeoutMs;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
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

Appium.prototype.getDeviceType = function (args, caps) {
  if (args.ipa) {
    return DT_IOS;
  } else if (args.safari) {
    return DT_IOS;
  } else if (args.androidPackage || args.avd) {
    return DT_ANDROID;
  }
  try {
    return this.getDeviceTypeFromApp(args.app || caps.app);
  } catch (e) {
    return this.getDeviceTypeFromCaps(caps);
  }
};

Appium.prototype.getDeviceTypeFromCaps = function (caps) {
  var errMsg = "A valid device type is required in the capabilities list";

  if (caps.device) {
    if (caps.device.toLowerCase().indexOf('iphone') !== -1) {
      return DT_IOS;
    } else if (caps.device.toLowerCase().indexOf('ipad') !== -1) {
      return DT_IOS;
    } else if (caps.device.toLowerCase().indexOf('selendroid') !== -1) {
      return DT_SELENDROID;
    } else if (caps.device.toLowerCase().indexOf('firefox') !== -1) {
      return DT_FIREFOX_OS;
    } else if (caps.device.toLowerCase().indexOf('android') !== -1) {
      return DT_ANDROID;
    } else if (caps.device === DT_MOCK_IOS) {
      return DT_MOCK_IOS;
    } else {
      throw new Error(errMsg);
    }
  }

  throw new Error(errMsg);
};

Appium.prototype.getDeviceTypeFromApp = function (app) {
  if (/\.app/.test(app)) {
    return DT_IOS;
  } else if (/\.apk/.test(app)) {
    return DT_ANDROID;
  } else if ((app && app.toLowerCase() === "safari")) {
    return DT_IOS;
  } else if ((app && app.toLowerCase() === "settings")) {
    return DT_IOS;
  }
  throw new Error("Could not determine your device type from app '" + app + "'");
};

Appium.prototype.isMockIos = function () {
  return this.deviceType === DT_MOCK_IOS;
};

Appium.prototype.isIos = function () {
  return this.deviceType === DT_IOS;
};

Appium.prototype.isAndroid = function () {
  return this.deviceType === DT_ANDROID;
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
  return this.deviceType === DT_SELENDROID;
};

Appium.prototype.isFirefoxOS = function () {
  return this.deviceType === DT_FIREFOX_OS;
};

Appium.prototype.getAppExt = function () {
  return this.isIos() ? ".app" : ".apk";
};

Appium.prototype.configure = function (args, desiredCaps, cb) {
  var deviceType;
  try {
    deviceType = this.getDeviceType(args, desiredCaps);
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

      this.device.start(onStart, this.cleanupSession.bind(this));
    }

  } else {
    return cb(new Error("Requested a new session but one was in progress"));
  }
};

Appium.prototype.getDevice = function (deviceType) {
  var caps = this.desiredCapabilities;
  var DeviceClass = (function () {
    switch (deviceType) {
      case DT_IOS:
        return (caps.safari || caps.iwebview) ? Safari : IOS;
      case DT_ANDROID:
        return this.isChrome(this.args, caps) ? Chrome : Android;
      case DT_SELENDROID:
        return Selendroid;
      case DT_FIREFOX_OS:
        return FirefoxOs;
      default:
        throw new Error("Tried to start a device that doesn't exist: " +
                        deviceType);
    }
  });
  return new DeviceClass();
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
  this.device.stop(function (code) {
    var err;
    if (code && code > 0) {
      err = new Error("Device exited with code: " + code);
    }
    this.cleanupSession(err, cb);
  }.bind(this));
};


Appium.prototype.reset = function (cb) {
  logger.info("Resetting app mid-session");
  if ((this.isIos() && !this.device.instruments.udid) || !this.args.fastReset) {
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
