"use strict";

var errors = require('../../server/errors.js')
  , exec = require('child_process').exec
  , path = require('path')
  , fs = require('fs')
  , adb = require('./adb.js')
  , helpers = require('../../helpers.js')
  , getTempPath = helpers.getTempPath
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , status = require("../../server/status.js")
  , helperJarPath = path.resolve(__dirname, 'helpers')
  , async = require('async')
  , androidController = require('./android-controller.js')
  , uiautomator = require('./uiautomator.js')
  , UnknownError = errors.UnknownError;

var Android = function(opts) {
  this.initialize(opts);
};

Android.prototype.initialize = function(opts) {
  this.compressXml = opts.compressXml;
  this.rest = opts.rest;
  this.webSocket = opts.webSocket;
  opts.systemPort = opts.systemPort || 4724;
  opts.devicePort = opts.devicePort || 4724;
  this.opts = opts;
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity;
  this.avdName = opts.avdName;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.verbose = opts.verbose;
  this.queue = [];
  this.progress = 0;
  this.onStop = function() {};
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

// Clear data, close app, then start app.
Android.prototype.fastReset = function(cb) {
  async.series([
    function(cb) { this.adb.stopAndClear(this.appPackage, cb); }.bind(this),
    function(cb) { this.adb.waitForNotActivity(cb); }.bind(this),
    function(cb) { this.adb.startApp(cb); }.bind(this),
  ], cb);
};

Android.prototype.start = function(cb, onDie) {
  if (typeof onDie === "function") {
    this.onStop = onDie;
  }
  var didLaunch = false;

  var onLaunch = function(err, launchCb) {
    if (typeof launchCb === "undefined" || launchCb === null) {
      launchCb = cb;
    }
    var relaunchOn = [
      'Could not find a connected Android device'
      , 'Device did not become ready'
    ];
    var checkShouldRelaunch = function(msg) {
      var relaunch = false;
      _.each(relaunchOn, function(relaunchMsg) {
        relaunch = relaunch || msg.indexOf(relaunchMsg) !== -1;
      });
      return relaunch;
    };

    if (err) {
      // This message is from adb.js. Must update when adb.js changes.
      if (err.message === null ||
          typeof err.message === 'undefined' ||
          checkShouldRelaunch(err.message.toString())) {
        logger.error(err);
        logger.error("Above error isn't fatal, maybe relaunching adb will help....");
        this.adb.waitForDevice(function(err) {
          if (err) return launchCb(err);
          didLaunch = true;
          launchCb();
        });
      } else {
        // error is already printed by ADB.prototype.waitForActivity
        this.shutdown();
        this.adb = null;
        this.onStop = null;
        launchCb(err);
      }
    } else {
      logger.info("ADB launched! Ready for commands (will time out in " +
                  (this.commandTimeoutMs / 1000) + "secs)");
      this.resetTimeout();
      didLaunch = true;
      launchCb(null);
    }
  }.bind(this);

  var onExit = function(code) {
    if (!didLaunch) {
      logger.error("ADB quit before it successfully launched");
      cb("ADB quit unexpectedly before successfully launching");
      code = code || 1;
    } else if (typeof this.cbForCurrentCmd === "function") {
      var error = new UnknownError("ADB died while responding to command, " +
                                   "please check appium logs!");
      this.cbForCurrentCmd(error, null);
      code = code || 1;
    }

    if (this.adb) {
      this.adb.uninstallApp(function() {
        this.adb = null;
        this.shuttingDown = false;
        this.onStop(code);
        this.onStop = null;
      }.bind(this));
    } else {
      logger.info("We're in android's exit callback but adb is gone already");
    }
  }.bind(this);

  if (this.adb === null) {
    // Pass Android opts and Android ref to adb.
    this.adb = adb(this.opts, this);
    this.uiautomator = uiautomator(this.adb, this.opts);
    this.startAppium(onLaunch, onExit);
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

// XXX convert to use new adb
Android.prototype.startAppium = function(onLaunch, onExit) {
  logger.info("Starting android appium");
  this.uiautomator.onExit = onExit;

  logger.debug("Using fast reset? " + this.fastReset);

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
    onLaunch(err);
  });
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
      this.adb.push(binPath, this.remoteTempDir(), cb);
    }
  }.bind(this));
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
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  if (this.adb === null) {
    logger.info("Trying to stop adb but it already exited");
    if (cb) {
      cb();
    }
  } else {
    if (cb) {
      this.onStop = cb;
    }
    this.shuttingDown = true;
    this.adb.goToHome(function() {
      this.shutdown();
    }.bind(this));
    this.queue = [];
    this.progress = 0;
  }
};

Android.prototype.shutdown = function() {
  this.adb.sendShutdownCommand(function() {
    logger.info("Sent shutdown command, waiting for ADB to stop...");
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
      this.adb.sendAutomatorCommand(action, params, function(response) {
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

module.exports = function(opts) {
  return new Android(opts);
};

module.exports.Android = Android;
