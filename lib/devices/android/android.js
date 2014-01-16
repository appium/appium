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
  this.skipUninstall = opts.fastReset || !opts.reset;
  this.fastClear = opts.fastClear !== false;
  this.rest = opts.rest;
  this.webSocket = opts.webSocket;
  opts.systemPort = opts.systemPort || 4724;
  opts.devicePort = opts.devicePort || 4724;
  this.opts = opts;
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appMd5Hash = null;
  this.appWaitActivity = opts.appWaitActivity || opts.appActivity;
  this.avdName = opts.avdName || null;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.verbose = opts.verbose;
  this.queue = [];
  this.progress = 0;
  this.implicitWaitMs = 0;
  this.shuttingDown = false;
  this.adb = null;
  this.uiautomator = null;
  this.uiautomatorRestartOnExit = false;
  this.uiautomatorIgnoreExit = false;
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
  _.extend(this.capabilities, opts.desiredCapabilities);
};

Android.prototype.start = function(cb, onDie) {
  this.launchCb = cb;
  this.uiautomatorExitCb = onDie;

  if (this.adb === null) {
    // Pass Android opts and Android ref to adb.
    logger.info("Starting android appium");
    this.adb = new ADB(this.opts);
    this.uiautomator = new UiAutomator(this.adb, this.opts);
    this.uiautomator.setExitHandler(this.onUiautomatorExit.bind(this));

    logger.debug("Using fast reset? " + this.opts.fastReset);

    async.series([
      this.prepareDevice.bind(this),
      this.checkApiLevel.bind(this),
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
      if (err) {
        this.shutdown(function() {
          this.launchCb(err);
        }.bind(this));
      } else {
        this.didLaunch = true;
        this.launchCb();
      }
    }.bind(this));
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.onLaunch = function(err) {
  var readyToGo = function() {
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

Android.prototype.restartUiautomator = function(cb) {
  async.series([
    this.forwardPort.bind(this)
    , this.uiautomator.start.bind(this.uiautomator)
  ], cb);
};

Android.prototype.wrapActionAndHandleADBDisconnect = function(action, ocb) {
  async.series([
    function(cb) {
      this.uiautomatorIgnoreExit = true;
      action(cb);
    }.bind(this)
    , function(cb) {
      setTimeout(function() {
        this.adb.ping(function(err, ok) {
          if(ok) {
            this.uiautomatorIgnoreExit = false;
            cb();
          } else {
            logger.debug(err);
            async.series([
              this.restartAdb.bind(this)
              , this.restartUiautomator.bind(this)
            ], function(err) {
              if (err) {
                logger.debug(err);
              }
              this.uiautomatorIgnoreExit = false;
              cb(err);
            }.bind(this));
          }
        }.bind(this));
      }.bind(this), 10000);
    }.bind(this)
  ], ocb);
};

Android.prototype.onUiautomatorExit = function() {
  var respondToClient = function() {
    this.cleanup();
    if (!this.didLaunch) {
      var msg = "UiAutomator quit before it successfully launched";
      logger.error(msg);
      this.launchCb(new Error(msg));
      return;
    } else if (typeof this.cbForCurrentCmd === "function") {
      var error = new UnknownError("UiAutomator died while responding to " +
                                    "command, please check appium logs!");
      this.cbForCurrentCmd(error, null);
    }
    // make sure appium.js knows we crashed so it can clean up
    this.uiautomatorExitCb();
  }.bind(this);

  if (this.adb) {
    var uninstall = function() {
      logger.info("Attempting to uninstall app");
      this.uninstallApp(function() {
        this.shuttingDown = false;
        respondToClient();
      }.bind(this));
    }.bind(this);

    if(!this.uiautomatorIgnoreExit) {
      this.adb.ping(function(err, ok) {
        if(ok) {
          uninstall();
        } else {
          logger.debug(err);
          this.restartAdb(function(err) {
            if (err) {
              logger.debug(err);
            }
            if(this.uiautomatorRestartOnExit) {
              this.uiautomatorRestartOnExit = false;
              this.restartUiautomator(function(err) {
                if (err) {
                  logger.debug(err);
                  uninstall();
                }
              }.bind(this));
            } else {
              uninstall();
            }
          }.bind(this));
        }
      }.bind(this));
    } else {
      this.uiautomatorIgnoreExit = false;
    }
  } else {
    logger.info("We're in uiautomator's exit callback but adb is gone already");
    respondToClient();
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

Android.prototype.checkApiLevel = function(cb) {
  this.adb.getApiLevel(function(err, apiLevel) {
    if (err) return cb(err);

    if (parseInt(apiLevel) < 17) {
      var msg = "Android devices must be of API level 17 or higher. Please change your device to Selendroid or upgrade Android on your device.";
      logger.error(msg); // logs the error when we encounter it
      return cb(new Error(msg)); // send the error up the chain
    }

    cb();
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
    if (!this.appPackage) {
      return cb(new Error("Parameter 'app-package' is required for launching application"));
    }
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

Android.prototype.requestXmlCompression = function(cb) {
  if (this.compressXml) {
    this.proxy(["enableCompressedLayoutHeirarchy"], cb);
  } else {
    cb();
  }
};


Android.prototype.stop = function(cb) {
  this.shuttingDown = true;
  if (this.adb) {
    this.adb.goToHome(function() {
      this.shutdown(cb);
    }.bind(this));
  } else {
    this.shutdown(cb);
  }
};

Android.prototype.cleanup = function() {
  logger.info("Cleaning up android objects");
  this.queue = [];
  this.progress = 0;
  this.adb = null;
  this.uiautomator = null;
};

Android.prototype.shutdown = function(cb) {
  var next = function() {
    if (this.uiautomator) {
      this.uiautomator.shutdown(function() {
        this.cleanup();
        cb();
      }.bind(this));
    } else {
      this.cleanup();
      cb();
    }
  }.bind(this);

  if (this.adb) {
    this.adb.stopLogcat(function() {
      next();
    }.bind(this));
  } else {
    next();
  }
};

Android.prototype.proxy = deviceCommon.proxy;
Android.prototype.respond = deviceCommon.respond;

Android.prototype.push = function(elem) {
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

_.extend(Android.prototype, androidController);
_.extend(Android.prototype, androidCommon);

module.exports = Android;
