"use strict";

var errors = require('../../server/errors.js')
  , path = require('path')
  , fs = require('fs')
  , ADB = require('./adb.js')
  , Device = require('../device.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , status = require("../../server/status.js")
  , async = require('async')
  , androidController = require('./android-controller.js')
  , androidContextController = require('./android-context-controller.js')
  , androidCommon = require('./android-common.js')
  , androidHybrid = require('./android-hybrid.js')
  , UiAutomator = require('./uiautomator.js')
  , UnknownError = errors.UnknownError;

var Android = function () {
  this.init();
};

_.extend(Android.prototype, Device.prototype);

Android.prototype._deviceInit = Device.prototype.init;
Android.prototype.init = function () {
  this._deviceInit();
  this.appExt = ".apk";
  this.capabilities = {
    platform: 'LINUX'
  , browserName: 'Android'
  , platformVersion: '4.1'
  , webStorageEnabled: false
  , takesScreenshot: true
  , javascriptEnabled: true
  , databaseEnabled: false
  };
  this.args.devicePort = 4724;
  this.appMd5Hash = null;
  this.args.avd = null;
  this.args.language = null;
  this.args.locale = null;
  this.initQueue();
  this.implicitWaitMs = 0;
  this.shuttingDown = false;
  this.adb = null;
  this.uiautomator = null;
  this.uiautomatorRestartOnExit = false;
  this.uiautomatorIgnoreExit = false;
  this.swipeStepsPerSec = 28;
  this.dragStepsPerSec = 40;
  this.asyncWaitMs = 0;
  this.remote = null;
  this.contexts = [];
  this.curContext = this.defaultContext();
  this.didLaunch = false;
  this.launchCb = function () {};
  this.uiautomatorExitCb = function () {};
  this.dataDir = null;
  this.isProxy = false;
  this.proxyHost = null;
  this.proxyPort = null;
  this.proxySessionId = null;
  this.avoidProxy = [
    ['POST', new RegExp('^/wd/hub/session/[^/]+/window')]
  , ['GET', new RegExp('^/wd/hub/session/[^/]+/window_handle')]
  , ['GET', new RegExp('^/wd/hub/session/[^/]+/window_handles')]
  , ['POST', new RegExp('^/wd/hub/session/[^/]+/context')]
  , ['GET', new RegExp('^/wd/hub/session/[^/]+/context')]
  , ['GET', new RegExp('^/wd/hub/session/[^/]+/contexts')]
  , ['POST', new RegExp('^/wd/hub/session/[^/]+/appium')]
  , ['GET', new RegExp('^/wd/hub/session/[^/]+/appium')]
  ];
};

Android.prototype._deviceConfigure = Device.prototype.configure;

Android.prototype.start = function (cb, onDie) {
  this.launchCb = cb;
  this.uiautomatorExitCb = onDie;

  if (this.adb === null) {
    // Pass Android opts and Android ref to adb.
    logger.info("Starting android appium");
    this.adb = new ADB(this.args);
    this.uiautomator = new UiAutomator(this.adb, this.args);
    this.uiautomator.setExitHandler(this.onUiautomatorExit.bind(this));

    logger.debug("Using fast reset? " + this.args.fastReset);
    async.series([
      this.prepareDevice.bind(this),
      this.packageAndLaunchActivityFromManifest.bind(this),
      this.checkApiLevel.bind(this),
      this.pushStrings.bind(this),
      this.processFromManifest.bind(this),
      this.uninstallApp.bind(this),
      this.installApp.bind(this),
      this.forwardPort.bind(this),
      this.pushAppium.bind(this),
      this.initUnicode.bind(this),
      this.pushSettingsApp.bind(this),
      this.pushUnlock.bind(this),
      this.uiautomator.start.bind(this.uiautomator),
      this.wakeUp.bind(this),
      this.unlockScreen.bind(this),
      this.getDataDir.bind(this),
      this.startApp.bind(this),
      this.initAutoWebview.bind(this)
    ], function (err) {
      if (err) {
        this.shutdown(function () {
          this.launchCb(err);
        }.bind(this));
      } else {
        this.didLaunch = true;
        this.launchCb(null, this.proxySessionId);
      }
    }.bind(this));
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.onLaunch = function (err) {
  var readyToGo = function () {
    this.didLaunch = true;
    this.launchCb();
  }.bind(this);

  var giveUp = function (err) {
    this.shutdown(function () {
      this.launchCb(err);
    }.bind(this));
  }.bind(this);

  if (err) {
    if (this.checkShouldRelaunch(err)) {
      logger.error(err);
      logger.error("Above error isn't fatal, maybe relaunching adb will help....");
      this.adb.waitForDevice(function (err) {
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

Android.prototype.restartUiautomator = function (cb) {
  async.series([
    this.forwardPort.bind(this)
    , this.uiautomator.start.bind(this.uiautomator)
  ], cb);
};

/*
 * Execute an arbitrary function and handle potential ADB disconnection before
 * proceeding
 */
Android.prototype.wrapActionAndHandleADBDisconnect = function (action, ocb) {
  async.series([
    function (cb) {
      this.uiautomatorIgnoreExit = true;
      action(cb);
    }.bind(this)
    , this.adb.restart.bind(this.adb)
    , this.restartUiautomator.bind(this)
  ], function (err) {
    this.uiautomatorIgnoreExit = false;
    ocb(err);
  }.bind(this));
};

Android.prototype.onUiautomatorExit = function () {
  logger.debug("UiAutomator exited");
  var respondToClient = function () {
    this.cleanupChromedriver(function () {
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
    }.bind(this));
  }.bind(this);

  if (this.adb) {
    var uninstall = function () {
      logger.debug("Attempting to uninstall app");
      this.uninstallApp(function () {
        this.shuttingDown = false;
        respondToClient();
      }.bind(this));
    }.bind(this);

    if (!this.uiautomatorIgnoreExit) {
      this.adb.ping(function (err, ok) {
        if (ok) {
          uninstall();
        } else {
          logger.debug(err);
          this.adb.restart(function (err) {
            if (err) {
              logger.debug(err);
            }
            if (this.uiautomatorRestartOnExit) {
              this.uiautomatorRestartOnExit = false;
              this.restartUiautomator(function (err) {
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
    logger.debug("We're in uiautomator's exit callback but adb is gone already");
    respondToClient();
  }
};

Android.prototype.checkShouldRelaunch = function (launchErr) {
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
  _.each(relaunchOn, function (relaunchMsg) {
    relaunch = relaunch || msg.indexOf(relaunchMsg) !== -1;
  });
  return relaunch;
};

Android.prototype.checkApiLevel = function (cb) {
  this.adb.getApiLevel(function (err, apiLevel) {
    if (err) return cb(err);
    logger.info('Device API level is:', parseInt(apiLevel, 10));
    if (parseInt(apiLevel) < 17) {
      var msg = "Android devices must be of API level 17 or higher. Please change your device to Selendroid or upgrade Android on your device.";
      logger.error(msg); // logs the error when we encounter it
      return cb(new Error(msg)); // send the error up the chain
    }

    cb();
  });
};

Android.prototype.processFromManifest = function (cb) {
  if (!this.args.app) {
    return cb();
  } else { // apk must be local to process the manifest.
    this.adb.processFromManifest(this.args.app, function (err, process) {
      var value = process || this.args.appPackage;

      this.appProcess = value;
      logger.debug("Set app process to: " + this.appProcess);

      cb();
    }.bind(this));
  }
};

Android.prototype.pushStrings = function (cb, language) {
  var outputPath = path.resolve(this.args.tmpDir, this.args.appPackage);
  var remotePath = '/data/local/tmp';
  var stringsJson = 'strings.json';
  this.extractStrings(function (err) {
    if (err) {
      if (!fs.existsSync(this.args.app)) {
        // apk doesn't exist locally so remove old strings.json
        return this.adb.rimraf(remotePath + '/' + stringsJson, function (err) {
          if (err) return cb(new Error("Could not remove old strings"));
          cb();
        });
      } else {
        // if we can't get strings, just dump an empty json and continue
        var remoteFile = remotePath + '/' + stringsJson;
        return this.adb.shell("echo '{}' > " + remoteFile, cb);
      }
    }
    var jsonFile = path.resolve(outputPath, stringsJson);
    this.adb.push(jsonFile, remotePath, function (err) {
      if (err) return cb(new Error("Could not push strings.json"));
      cb();
    });
  }.bind(this), language);
};

Android.prototype.getStrings = function (language, cb) {
  if (this.language && this.language === language) {
    // Return last strings
    return cb(null, {
      status: status.codes.Success.code,
      value: this.apkStrings
    });
  }

  // Extract, push and return strings
  return this.pushStrings(function () {
    this.proxy(["updateStrings", {}], function (err, res) {
      if (err || res.status !== status.codes.Success.code) return cb(err, res);
      cb(null, {
        status: status.codes.Success.code,
        value: this.apkStrings
      });
    }.bind(this));
  }.bind(this), language);
};

Android.prototype.pushAppium = function (cb) {
  logger.debug("Pushing appium bootstrap to device...");
  var binPath = path.resolve(__dirname, "..", "..", "..", "build",
      "android_bootstrap", "AppiumBootstrap.jar");
  fs.stat(binPath, function (err) {
    if (err) {
      cb(new Error("Could not find AppiumBootstrap.jar; please run " +
                   "'grunt buildAndroidBootstrap'"));
    } else {
      this.adb.push(binPath, this.remoteTempPath(), cb);
    }
  }.bind(this));
};

Android.prototype.startApp = function (cb) {
  if (!this.args.androidCoverage) {
    this.adb.startApp({
      pkg: this.args.appPackage,
      activity: this.args.appActivity,
      action: this.args.intentAction,
      category: this.args.intentCategory,
      flags: this.args.intentFlags,
      waitPkg: this.args.appWaitPackage,
      waitActivity: this.args.appWaitActivity,
      optionalIntentArguments: this.args.optionalIntentArguments
    }, cb);
  } else {
    this.adb.androidCoverage(this.args.androidCoverage, this.args.appWaitPackage,
                             this.args.appWaitActivity, cb);
  }
};

Android.prototype.stop = function (cb) {
  if (this.shuttingDown) {
    logger.debug("Already in process of shutting down.");
    return cb();
  }
  this.shuttingDown = true;

  var completeShutdown = function (cb) {
    if (this.adb) {
      this.adb.goToHome(function () {
        this.shutdown(cb);
      }.bind(this));
    } else {
      this.shutdown(cb);
    }
  }.bind(this);

  if (this.args.fullReset) {
    logger.debug("Removing app from device");
    this.uninstallApp(function (err) {
      if (err) {
        // simply warn on error here, because we don't want to stop the shutdown
        // process
        logger.warn(err);
      }
      completeShutdown(cb);
    });
  } else {
    completeShutdown(cb);
  }


};

Android.prototype.cleanup = function () {
  logger.debug("Cleaning up android objects");
  this.adb = null;
  this.uiautomator = null;
  this.shuttingDown = false;
};

Android.prototype.shutdown = function (cb) {
  var next = function () {
    this.cleanupChromedriver(function () {
      if (this.uiautomator) {
        this.uiautomator.shutdown(function () {
          this.cleanup();
          cb();
        }.bind(this));
      } else {
        this.cleanup();
        cb();
      }
    }.bind(this));
  }.bind(this);

  if (this.adb) {
    this.adb.endAndroidCoverage();
    this.adb.setIME('com.android.inputmethod.latin/.LatinIME', function (err) {
      if (err) {
        // simply warn on error here, because we don't want to stop the shutdown
        // process
        logger.warn(err);
      }
      this.adb.stopLogcat(function () {
        next();
      }.bind(this));
    }.bind(this));
  } else {
    next();
  }
};

Android.prototype.proxy = deviceCommon.proxy;
Android.prototype.respond = deviceCommon.respond;

Android.prototype.initQueue = function () {
  this.queue = async.queue(function (task, cb) {
    var action = task.action,
        params = task.params;

    this.cbForCurrentCmd = cb;

    if (this.adb && !this.shuttingDown) {
      this.uiautomator.sendAction(action, params, function (response) {
        this.cbForCurrentCmd = null;
        if (typeof cb === 'function') {
          this.respond(response, cb);
        }
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
    }
  }.bind(this), 1);
};

Android.prototype.push = function (elem) {
  this.queue.push({action: elem[0][0], params: elem[0][1] || {}}, elem[1]);
};

Android.prototype.wakeUp = function (cb) {
  // requires an appium bootstrap connection loaded
  logger.debug("Waking up device if it's not alive");
  this.proxy(["wake", {}], cb);
};

Android.prototype.getDataDir = function (cb) {
  this.proxy(["getDataDir", {}], function (err, res) {
    if (err) return cb(err);
    this.dataDir = res.value;
    logger.debug("dataDir set to: " + this.dataDir);
    cb();
  }.bind(this));
};

Android.prototype.waitForActivityToStop = function (cb) {
  this.adb.waitForNotActivity(this.args.appWaitPackage, this.args.appWaitActivity, cb);
};

Android.prototype.waitForCondition = deviceCommon.waitForCondition;

_.extend(Android.prototype, androidController);
_.extend(Android.prototype, androidContextController);
_.extend(Android.prototype, androidCommon);
_.extend(Android.prototype, androidHybrid);

module.exports = Android;
