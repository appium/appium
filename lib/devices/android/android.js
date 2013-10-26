"use strict";

var errors = require('../../server/errors.js')
  , exec = require('child_process').exec
  , path = require('path')
  , fs = require('fs')
  , ADB = require('./adb.js')
  , helpers = require('../../helpers.js')
  , getTempPath = helpers.getTempPath
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , status = require("../../server/status.js")
  , helperJarPath = path.resolve(__dirname, 'helpers')
  , async = require('async')
  , androidController = require('./android-controller.js')
  , androidCommon = require('./android-common.js')
  , UiAutomator = require('./uiautomator.js')
  , UnknownError = errors.UnknownError;

var Android = function(opts) {
  this.initialize(opts);
};

Android.prototype.initialize = function(opts) {
  this.compressXml = opts.compressXml;
  this.skipUninstall = opts.fastReset;
  this.rest = opts.rest;
  this.webSocket = opts.webSocket;
  opts.systemPort = opts.systemPort || 4724;
  opts.devicePort = opts.devicePort || 4724;
  this.opts = opts;
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity || opts.appActivity;
  this.avdName = opts.avdName || null;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.verbose = opts.verbose;
  this.queue = [];
  this.progress = 0;
  this.implicitWaitMs = 0;
  this.commandTimeoutMs = 60 * 1000;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
  this.shuttingDown = false;
  this.adb = null;
  this.uiautomator = null;
  this.swipeStepsPerSec = 28;
  this.asyncWaitMs = 0;
  this.remote = null;
  this.curWindowHandle = null;
  this.didLaunch = false;
  this.launchCb = function() {};
  this.uiautomatorExitCb = function() {};
  this.capabilities = {
    platform: 'LINUX'
    , browserName: 'Android'
    , version: '4.1'
    , webStorageEnabled: false
    , takesScreenshot: true
    , javascriptEnabled: true
    , databaseEnabled: false
  };
};

Android.prototype.start = function(cb, onDie) {
  this.launchCb = cb;
  this.uiautomatorExitCb = onDie;

  if (this.adb === null) {
    // Pass Android opts and Android ref to adb.
    logger.info("Starting android appium");
    this.adb = new ADB(this.opts);
    this.uiautomator = new UiAutomator(this.adb, this.opts);
    this.uiautomator.onExit = this.uiautomatorExitCb;

    logger.debug("Using fast reset? " + this.opts.fastReset);

    async.series([
      this.prepareDevice.bind(this),
      this.pushStrings.bind(this),
      this.requestXmlCompression.bind(this),
      this.uninstallApp.bind(this),
      this.installApp.bind(this),
      this.forwardPort.bind(this),
      this.pushAppium.bind(this),
      this.pushUnlock.bind(this),
      this.uiautomator.start.bind(this.uiautomator),
      this.wakeUp.bind(this),
      this.unlockScreen.bind(this),
      this.startApp.bind(this)
    ], function(err) {
      this.launchCb(err);
    }.bind(this));
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.onLaunch = function(err) {
  var readyToGo = function() {
    logger.info("ADB launched! Ready for commands (will time out in " +
                (this.commandTimeoutMs / 1000) + "secs)");
    this.resetTimeout();
    this.didLaunch = true;
    this.launchCb();
  }.bind(this);

  var giveUp = function(err) {
    this.shutdown(function() {
      this.launchCb(err);
    }.bind(this));
  }.bind(this);

  if (err) {
    if (this.checkShouldRelaunch(err)) {
      logger.error(err);
      logger.error("Above error isn't fatal, maybe relaunching adb will help....");
      this.adb.waitForDevice(function(err) {
        if (err) return giveUp(err);
        readyToGo();
      });
    } else {
      giveUp(err);
    }
  } else {
    readyToGo();
  }
};

Android.prototype.onUiautomatorExit = function(code) {
  if (!this.didLaunch) {
    var msg = "UiAutomator quit before it successfully launched";
    logger.error(msg);
    this.launchCb(new Error(msg));
  } else if (typeof this.cbForCurrentCmd === "function") {
    var error = new UnknownError("UiAutomator died while responding to " +
                                  "command, please check appium logs!");
    this.cbForCurrentCmd(error, null);
    code = code || 1;
  }

  if (this.adb) {
    this.uninstallApp(function() {
      this.adb = null;
      this.uiautomator = null;
      this.shuttingDown = false;
    }.bind(this));
  } else {
    logger.info("We're in uiautomator's exit callback but adb is gone already");
  }
};

Android.prototype.checkShouldRelaunch = function(launchErr) {
  if (launchErr.message === null || typeof launchErr.message === 'undefined') {
    logger.error("We're checking if we should relaunch based on something " +
                 "which isn't an error object. Check the codez!");
    return false;
  }
  var msg = launchErr.message.toString();
  var relaunchOn = [
    'Could not find a connected Android device'
    , 'Device did not become ready'
  ];
  var relaunch = false;
  _.each(relaunchOn, function(relaunchMsg) {
    relaunch = relaunch || msg.indexOf(relaunchMsg) !== -1;
  });
  return relaunch;
};

Android.prototype.pushStrings = function(cb) {
  var remotePath = '/data/local/tmp';
  var stringsJson = 'strings.json';
  if (!fs.existsSync(this.apkPath)) {
    // apk doesn't exist locally so remove old strings.json
    logger.debug("Apk doesn't exist. Removing old strings.json");
    this.adb.rimraf(remotePath + '/' + stringsJson, function(err) {
      if (err) return cb(new Error("Could not remove old strings"));
      cb();
    });
  } else {
    var stringsFromApkJarPath = path.resolve(helperJarPath,
        'strings_from_apk.jar');
    var outputPath = path.resolve(getTempPath(), this.appPackage);
    var makeStrings = ['java -jar "', stringsFromApkJarPath,
                       '" "', this.apkPath, '" "', outputPath, '"'].join('');
    logger.debug(makeStrings);
    exec(makeStrings, { maxBuffer: 524288 }, function(err, stdout, stderr) {
      if (err) {
        logger.debug(stderr);
        return cb(new Error("Could not make strings from apk"));
      }
      var jsonFile = path.resolve(outputPath, stringsJson);
      this.adb.push(jsonFile, remotePath, function(err) {
        if (err) return cb(new Error("Could not push strings.json"));
        cb();
      });
    }.bind(this));
  }
};

Android.prototype.pushAppium = function(cb) {
  logger.debug("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "..", "..", "..", "build",
      "android_bootstrap", "AppiumBootstrap.jar");
  fs.stat(binPath, function(err) {
    if (err) {
      cb(new Error("Could not find AppiumBootstrap.jar; please run " +
                   "'grunt buildAndroidBootstrap'"));
    } else {
      this.adb.push(binPath, this.remoteTempPath(), cb);
    }
  }.bind(this));
};

Android.prototype.startApp = function(cb) {
  this.adb.startApp(this.appPackage, this.appActivity, this.appWaitActivity,
      cb);
};

Android.prototype.timeoutWaitingForCommand = function() {
  logger.info("Didn't get a new command in " + (this.commandTimeoutMs / 1000) +
              " secs, shutting down...");
  this.stop();
};

Android.prototype.requestXmlCompression = function(cb) {
  if (this.compressXml) {
    this.proxy(["enableCompressedLayoutHeirarchy"], cb);
  } else {
    cb();
  }
};

Android.prototype.uninstallApp = function(cb) {
  var next = function() {
    this.adb.uninstallApk(this.appPackage, function(err) {
      if (err) return cb(err);
      cb(null);
    }.bind(this));
  }.bind(this);

  if (this.skipUninstall) {
    logger.debug("Not uninstalling app since server not started with " +
               "--full-reset");
    cb();
  } else {
    next();
  }
};

Android.prototype.stop = function(cb) {
  this.shuttingDown = true;
  this.adb.goToHome(function() {
    this.shutdown(cb);
  }.bind(this));
};

Android.prototype.cleanup = function() {
  // should be called after all shutdowns
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  this.queue = [];
  this.progress = 0;
  this.adb = null;
  this.uiautomator = null;
};

Android.prototype.shutdown = function() {
  this.adb.stopLogcat(function() {
    this.uiautomator.sendShutdownCommand(function() {
      logger.info("Sent shutdown command, waiting for UiAutomator to stop...");
    }.bind(this));
  }.bind(this));
};

Android.prototype.resetTimeout = function() {
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  this.commandTimeout = setTimeout(this.timeoutWaitingForCommand.bind(this),
      this.commandTimeoutMs);
};

Android.prototype.proxy = deviceCommon.proxy;
Android.prototype.respond = deviceCommon.respond;

Android.prototype.push = function(elem) {
  this.resetTimeout();

  this.queue.push(elem);

  var next = function() {
    if (this.queue.length <= 0) {
      return;
    }

    if (this.queue[0] === null) {
      this.queue.shift();
      return;
    }

    // Always send the command.
    if (this.progress > 0) {
      this.progress = 0;
    }

    var target = this.queue.shift()
      , action = target[0][0]
      , params = typeof target[0][1] === "undefined" ? {} : target[0][1]
      , cb = target[1];

    this.cbForCurrentCmd = cb;

    this.progress++;

    if (this.adb && !this.shuttingDown) {
      this.uiautomator.sendAction(action, params, function(response) {
        this.cbForCurrentCmd = null;
        if (typeof cb === 'function') {
          this.respond(response, cb);
        }

        // maybe there's moar work to do
        this.progress--;
        next();
      }.bind(this));
    } else {
      this.cbForCurrentCmd = null;
      var msg = "Tried to send command to non-existent Android device, " +
                 "maybe it shut down?";
      if (this.shuttingDown) {
        msg = "We're in the middle of shutting down the Android device, " +
              "so your request won't be executed. Sorry!";
      }

      this.respond({
        status: status.codes.UnknownError.code
        , value: msg
      }, cb);
      this.progress--;
      next();
    }
  }.bind(this);

  next();
};

Android.prototype.wakeUp = function(cb) {
  // requires an appium bootstrap connection loaded
  logger.debug("Waking up device if it's not alive");
  this.proxy(["wake", {}], cb);
};

Android.prototype.waitForActivityToStop = function(cb) {
  this.adb.waitForNotActivity(this.appPackage, this.appWaitActivity, cb);
};

Android.prototype.waitForCondition = deviceCommon.waitForCondition;

Android.prototype.setCommandTimeout = function(secs, cb) {
  logger.info("Setting command timeout for android to " + secs + " secs");
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeoutMs = secs * 1000;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: secs
  });
};

Android.prototype.resetCommandTimeout = function(cb) {
  this.commandTimeoutMs = this.origCommandTimeoutMs;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: ''
  });
};

Android.prototype.getCommandTimeout = function(cb) {
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: this.commandTimeoutMs / 1000
  });
};

Android.prototype = _.extend(Android.prototype, androidController);
Android.prototype = _.extend(Android.prototype, androidCommon);

module.exports = function(opts) {
  return new Android(opts);
};

module.exports.Android = Android;
