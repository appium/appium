"use strict";

var ADB = require('./adb.js')
  , Device = require('../device.js')
  , mkdirp = require('mkdirp')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , androidController = require('./android-controller.js')
  , proxyTo = deviceCommon.proxyTo
  , logger = require('../../server/logger.js').get('appium')
  , status = require("../../server/status.js")
  , fs = require('fs')
  , async = require('async')
  , helpers = require('../../helpers.js')
  , getTempPath = helpers.getTempPath
  , androidCommon = require('./android-common.js')
  , path = require('path');

var Selendroid = function () {
  this.init();
};

_.extend(Selendroid.prototype, Device.prototype);
Selendroid.prototype._deviceInit = Device.prototype.init;
Selendroid.prototype.init = function () {
  this._deviceInit();
  this.appExt = ".apk";
  this.args.devicePort = 8080;
  this.serverApk = null;
  this.onStop = function () {};
  this.selendroidSessionId = null;
  this.adb = null;
  this.isProxy = true;
  this.mobileMethodsSupported = [
    'setLocation'
    , 'setCommandTimeout'
    , 'reset'
    , 'lock'
    , 'background'
    , 'keyevent'
    , 'currentActivity'
    , 'installApp'
    , 'uninstallApp'
    , 'removeApp'
    , 'closeApp'
    , 'isAppInstalled'
    , 'launchApp'
    , 'toggleData'
    , 'toggleFlightMode'
    , 'toggleWiFi'
    , 'toggleLocationServices'
  ];
  this.proxyHost = 'localhost';
  this.avoidProxy = [
    ['GET', new RegExp('^/wd/hub/session/[^/]+/log/types$')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/log')]
  ];
};

_.extend(Selendroid.prototype, androidCommon);
Selendroid.prototype._deviceConfigure = Device.prototype.configure;
Selendroid.prototype._setAndroidArgs = androidCommon.setAndroidArgs;
Selendroid.prototype.setAndroidArgs = function () {
  this._setAndroidArgs();
  this.args.systemPort = this.args.selendroidPort;
  this.proxyPort = this.args.systemPort;
};

Selendroid.prototype.start = function (cb) {
  logger.info("Starting selendroid server");
  this.adb = new ADB(this.args);

  var modServerExists = false
    , modAppPkg = null;

  var checkModServerExists = function (cb) {
    this.selendroidServerPath = path.resolve(getTempPath(),
        'selendroid.' + this.args.appPackage + '.apk');
    modAppPkg = this.args.appPackage + '.selendroid';
    fs.stat(this.selendroidServerPath, function (err) {
      modServerExists = !err;
      cb();
    });
  }.bind(this);

  var conditionalUninstallSelendroid = function (cb) {
    if (!modServerExists) {
      logger.info("Rebuilt selendroid apk does not exist, uninstalling " +
                  "any instances of it on device to make way for new one");
      this.adb.uninstallApk(modAppPkg, cb);
    } else {
      logger.info("Rebuilt selendroid apk exists, doing nothing");
      cb();
    }
  }.bind(this);

  var conditionalInsertManifest = function (cb) {
    if (!modServerExists) {
      logger.info("Rebuilt selendroid server does not exist, inserting " +
                  "modified manifest");
      this.insertSelendroidManifest(this.serverApk, cb);
    } else {
      logger.info("Rebuilt selendroid server already exists, no need to " +
                  "rebuild it with a new manifest");
      cb();
    }
  }.bind(this);

  var conditionalInstallSelendroid = function (cb) {
    this.adb.isAppInstalled(modAppPkg, function (e, installed) {
      if (!installed) {
        logger.info("Rebuilt selendroid is not installed, installing it");
        this.adb.install(this.selendroidServerPath, cb);
      } else {
        logger.info("Rebuilt selendroid is already installed");
        cb();
      }
    }.bind(this));
  }.bind(this);

  async.series([
    this.ensureServerExists.bind(this),
    this.prepareDevice.bind(this),
    this.packageAndLaunchActivityFromManifest.bind(this),
    checkModServerExists,
    conditionalUninstallSelendroid,
    conditionalInsertManifest,
    this.checkSelendroidCerts.bind(this),
    conditionalInstallSelendroid,
    this.uninstallApp.bind(this),
    this.installApp.bind(this),
    this.forwardPort.bind(this),
    this.pushUnlock.bind(this),
    this.unlockScreen.bind(this),
    this.pushSelendroid.bind(this),
    this.waitForServer.bind(this)
  ], function (err) {
    if (err) return cb(err);
    this.createSession(cb);
  }.bind(this));
};

Selendroid.prototype.pushSelendroid = function (cb) {
  var instrumentWith = this.args.appPackage + ".selendroid/" +
                       "io.selendroid.ServerInstrumentation";
  this.adb.instrument(this.args.appPackage, this.args.appActivity, instrumentWith, cb);
};

Selendroid.prototype.checkSelendroidCerts = function (cb) {
  var alreadyReturned = false
    , checks = 0;

  var onDoneSigning = function () {
    checks++;
    if (checks === 2 && !alreadyReturned) {
      cb();
    }
  };

  // these run in parallel
  var apks = [this.selendroidServerPath, this.args.app];
  _.each(apks, function (apk) {
    logger.info("Checking signed status of " + apk);
    this.adb.checkApkCert(apk, this.args.appPackage, function (err, isSigned) {
      if (err) return cb(err);
      if (isSigned) return onDoneSigning();
      this.adb.sign(apk, function (err) {
        if (err && !alreadyReturned) {
          alreadyReturned = true;
          return cb(err);
        }
        onDoneSigning();
      });
    }.bind(this));
  }.bind(this));
};

Selendroid.prototype.stop = function (cb) {

  var completeShutdown = function (cb) {
    logger.info("Stopping selendroid server");
    this.deleteSession(function (err) {
      cb(err ? 1 : 0);
    });
  }.bind(this);

  if (this.args.fullReset) {
    logger.info("Removing app from device");
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

Selendroid.prototype.keyevent = function (keycode, metastate, cb) {
  this.adb.keyevent(keycode, function () {
    cb(null, {
      status: status.codes.Success.code
    , value: null
    });
  });
};

/*
 * Execute an arbitrary function and handle potential ADB disconnection before
 * proceeding
 */
Selendroid.prototype.wrapActionAndHandleADBDisconnect = function (action, ocb) {
  async.series([
    function (cb) {
      action(cb);
    }.bind(this)
    , this.adb.restart.bind(this.adb)
    , this.forwardPort.bind(this)
  ], function (err) {
    ocb(err);
  }.bind(this));
};

Selendroid.prototype.ensureServerExists = function (cb) {
  logger.info("Checking whether selendroid is built yet");
  var selBin = path.resolve(__dirname, "..", "..", "..", "build", "selendroid",
      "selendroid.apk");
  fs.stat(selBin, function (err) {
    if (err) {
      logger.info("Selendroid needs to be built; please run ./reset.sh " +
                  "--selendroid");
      return cb(err);
    }
    logger.info("Selendroid server exists!");
    this.serverApk = selBin;
    cb(null);
  }.bind(this));
};

Selendroid.prototype.waitForServer = function (cb) {
  var waitMs = 20000
    , intMs = 800
    , start = Date.now();

  var pingServer = function () {
    this.proxyTo('/wd/hub/status', 'GET', null, function (err, res, body) {
      if (body === null || typeof body === "undefined" || !body.trim()) {
        if (Date.now() - start < waitMs) {
          setTimeout(pingServer, intMs);
        } else {
          cb(new Error("Waited " + (waitMs / 1000) + " secs for " +
                       "selendroid server and it never showed up"));
        }
      } else {
        logger.info("Selendroid server is alive!");
        cb(null);
      }
    });
  }.bind(this);

  pingServer();
};

Selendroid.prototype.createSession = function (cb) {
  logger.info("Listening for Selendroid logs");
  this.adb.logcat.on('log', function (logObj) {
    if (/System/.test(logObj.message)) {
      var type = "";
      if (/System\.err/.test(logObj.message)) {
        type = " ERR";
      }
      var msg = logObj.message.replace(/^.+: /, '');
      logger.info("[SELENDROID" + type + "] " + msg);
    }
  }.bind(this));
  logger.info("Creating Selendroid session");
  var data = {desiredCapabilities: this.capabilities};
  this.proxyTo('/wd/hub/session', 'POST', data, function (err, res, body) {
    if (err) return cb(err);

    if (res.statusCode === 301 && body.sessionId) {
      logger.info("Successfully started selendroid session");
      this.selendroidSessionId = body.sessionId;
      this.adb.waitForActivity(this.args.appWaitPackage, this.args.appWaitActivity, 1800,
          function (err) {
        if (err) {
          logger.info("Selendroid hasn't started app yet, let's do it " +
                      "manually with adb.startApp");
          return this.adb.startApp(this.args.appPackage, this.args.appActivity,
              this.args.appWaitPackage, this.args.appWaitActivity, false, function (err) {
            if (err) return cb(err);
            return cb(null, body.sessionId);
          }.bind(this));
        }
        return cb(null, body.sessionId);
      }.bind(this), 1800);
    } else {
      logger.error("Selendroid create session did not work. Status was " +
                   res.statusCode + " and body was " + body);
      cb(new Error("Did not get session redirect from selendroid"));
    }
  }.bind(this));
};

Selendroid.prototype.deleteSession = function (cb) {
  var url = '/wd/hub/session/' + this.selendroidSessionId;
  this.proxyTo(url, 'DELETE', null, function (err, res) {
    if (err) return cb(err);
    if (res.statusCode !== 200) return cb(new Error("Status was not 200"));
    this.adb.forceStop(this.args.appPackage, function (err) {
      if (err) return cb(err);
      this.adb.stopLogcat(cb);
    }.bind(this));
  }.bind(this));
};

Selendroid.prototype.proxyTo = proxyTo;

Selendroid.prototype.insertSelendroidManifest = function (serverPath, cb) {
  logger.info("Inserting selendroid manifest");
  var newServerPath = this.selendroidServerPath
    , newPackage = this.args.appPackage + '.selendroid'
    , srcManifest = path.resolve(__dirname, '..', '..', '..', 'build',
        'selendroid', 'AndroidManifest.xml')
    , dstDir = path.resolve(getTempPath(), this.args.appPackage)
    , dstManifest = path.resolve(dstDir, 'AndroidManifest.xml');

  try {
    fs.mkdirSync(dstDir);
  } catch (e) {
    if (e.message.indexOf("EEXIST") === -1) {
      throw e;
    }
  }
  fs.writeFileSync(dstManifest, fs.readFileSync(srcManifest, "utf8"), "utf8");
  async.series([
    function (cb) { mkdirp(dstDir, cb); }.bind(this),
    function (cb) { this.adb.checkSdkBinaryPresent("aapt", cb); }.bind(this),
    function (cb) {
      this.adb.compileManifest(dstManifest, newPackage,
      this.args.appPackage, cb);
    }.bind(this),
    function (cb) {
      this.adb.insertManifest(dstManifest, serverPath,
        newServerPath, cb);
    }.bind(this)
  ], cb);
};

Selendroid.prototype.setLocation = androidController.setLocation;
Selendroid.prototype.removeApp = androidController.removeApp;
Selendroid.prototype.unpackApp = androidController.unpackApp;

Selendroid.prototype.translatePath = function (req) {
  var path = req.originalUrl;
  if (path.indexOf("contexts") != -1) {
    logger.info("Temporarily translating 'contexts' to 'window_handles");
    path = path.replace("contexts", "window_handles");
  } else if (path.indexOf("context") != -1) {
    logger.info("Temporarily translating 'context' to 'window'");
    path = path.replace("context", "window");
  }
  req.originalUrl = path;
};

module.exports = Selendroid;
