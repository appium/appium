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
  , jwpResponse = require('./devices/common.js').jwpResponse
  , status = require("./server/status.js");

var DT_IOS = "ios"
  , DT_SAFARI = "safari"
  , DT_ANDROID = "android"
  , DT_CHROME = "chrome"
  , DT_SELENDROID = "selendroid"
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
  if (this.sessionId === null || this.sessionOverride) {
    this.configure(this.args, desiredCaps, function (err) {
      if (err) {
        logger.info("Got configuration error, not starting session");
        this.cleanupSession();
        cb(err, null);
      } else {
        this.invoke(cb);
      }
    }.bind(this));
  } else {
    return cb(new Error("Requested a new session but one was in progress"));
  }
};

Appium.prototype.getDeviceType = function (args, caps) {
  var type = this.getDeviceTypeFromArgs(args) ||
             this.getDeviceTypeFromDeviceCap(caps.device) ||
             this.getDeviceTypeFromApp(args.app || caps.app) ||
             this.getDeviceTypeFromPackage(args.androidPackage ||
                                           caps['app-package']);
  if (type) return type;
  throw new Error("Could not determine your device from Appium arguments " +
                  "or desired capabilities. Please make sure to specify the " +
                  "'device' capability");
};

Appium.prototype.getDeviceTypeFromDeviceCap = function (device) {
  device = device ? device.toString().toLowerCase() : '';

  if (device.toLowerCase().indexOf('iphone') !== -1) {
    return DT_IOS;
  } else if (device.toLowerCase().indexOf('ipad') !== -1) {
    return DT_IOS;
  } else if (device.toLowerCase().indexOf('selendroid') !== -1) {
    return DT_SELENDROID;
  } else if (device.toLowerCase().indexOf('firefox') !== -1) {
    return DT_FIREFOX_OS;
  } else if (device.toLowerCase().indexOf('android') !== -1) {
    return DT_ANDROID;
  }
};

Appium.prototype.getDeviceTypeFromApp = function (app) {
  if (/\.app$/.test(app) || /\.app\.zip$/.test(app)) {
    return DT_IOS;
  } else if (/\.apk$/.test(app) || /\.apk\.zip$/.test(app)) {
    return DT_ANDROID;
  } else if ((app && app.toLowerCase() === "safari")) {
    return DT_SAFARI;
  } else if ((app && app.toLowerCase() === "settings")) {
    return DT_IOS;
  } else if (_.contains(["chrome", "chromium", "browser"], app)) {
    return DT_CHROME;
  }
};

Appium.prototype.getDeviceTypeFromPackage = function (pkg) {
  var chromePkgs = [
    "com.android.chrome"
  , "org.chromium.chrome.testshell"
  , "com.android.browser"
  ];
  if (_.contains(chromePkgs, pkg)) {
    return DT_CHROME;
  } else if (pkg) {
    return DT_ANDROID;
  }
};

Appium.prototype.getDeviceTypeFromArgs = function (args) {
  if (args.ipa) {
    return DT_IOS;
  } else if (args.safari) {
    return DT_SAFARI;
  }
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
    logger.error("Trying to run a session for device '" + deviceType + "' " +
                 "but that device hasn't been configured. Run config");
    return cb(new Error("Device " + deviceType + " not configured yet"));
  }
  this.device = this.getNewDevice(deviceType);
  this.device.configure(args, desiredCaps, cb);
};

Appium.prototype.invoke = function (cb) {
  this.sessionId = UUID.create().hex;
  logger.info('Creating new appium session ' + this.sessionId);

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
};

Appium.prototype.getNewDevice = function (deviceType) {
  var DeviceClass = (function () {
    switch (deviceType) {
      case DT_IOS:
        return IOS;
      case DT_SAFARI:
        return Safari;
      case DT_ANDROID:
        return Android;
      case DT_CHROME:
        return Chrome;
      case DT_SELENDROID:
        return Selendroid;
      case DT_FIREFOX_OS:
        return FirefoxOs;
      default:
        throw new Error("Tried to start a device that doesn't exist: " +
                        deviceType);
    }
  })();
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
  jwpResponse(null, secs, cb);
};

Appium.prototype.resetCommandTimeout = function (cb) {
  this.commandTimeoutMs = this.origCommandTimeoutMs;
  this.resetTimeout();
  jwpResponse(cb);
};

Appium.prototype.getCommandTimeout = function (cb) {
  jwpResponse(null, this.commandTimeoutMs / 1000, cb);
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
  if (this.args.fastReset && typeof this.device.fastReset === "function") {
    logger.info("Running fast reset on device");
    this.device.fastReset(function (err) {
      jwpResponse(err, cb);
    });
  } else if (!this.args.fastReset &&
             typeof this.device.fullReset === "function") {
    logger.info("Running full reset on device");
  } else if (!this.args.fastReset) {
    logger.info("Running generic full reset");
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
          jwpResponse(cb);
        });
      }.bind(this));
    }.bind(this));
  } else {
    logger.warn("No reset strategy available");
    jwpResponse(cb);
  }
};

module.exports = function (args) {
  return new Appium(args);
};
