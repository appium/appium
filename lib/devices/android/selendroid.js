"use strict";

var ADB = require('./adb.js')
  , Device = require('../device.js')
  , mkdirp = require('mkdirp')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , androidController = require('./android-controller.js')
  , androidContextController = require('./android-context-controller.js')
  , proxyTo = deviceCommon.proxyTo
  , doRequest = deviceCommon.doRequest
  , logger = require('../../server/logger.js').get('appium')
  , status = require("../../server/status.js")
  , fs = require('fs')
  , async = require('async')
  , androidCommon = require('./android-common.js')
  , androidHybrid = require('./android-hybrid.js')
  , path = require('path')
  , utf7 = require('utf7').imap;

var Selendroid = function () {
  this.init();
};

_.extend(Selendroid.prototype, Device.prototype);
Selendroid.prototype._deviceInit = Device.prototype.init;
Selendroid.prototype.init = function () {
  this._deviceInit();
  this.selendroidHost = 'localhost';
  this.selendroidPort = 8080;
  this.selendroidSessionId = null;
  this.appExt = ".apk";
  this.args.devicePort = this.selendroidPort;
  this.serverApk = null;
  this.onStop = function () {};
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
    , 'getStrings'
  ];
  this.proxyHost = this.selendroidHost;
  this.avoidProxy = [
    ['GET', new RegExp('^/wd/hub/session/[^/]+/log/types$')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/log')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/location')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/appium')]
    , ['GET', new RegExp('^/wd/hub/session/[^/]+/appium')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/context')]
    , ['GET', new RegExp('^/wd/hub/session/[^/]+/context')]
    , ['GET', new RegExp('^/wd/hub/session/[^/]+/contexts')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/element/[^/]+/value')]
    , ['GET', new RegExp('^/wd/hub/session/[^/]+/network_connection')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/network_connection')]
    , ['POST', new RegExp('^/wd/hub/session/[^/]+/ime')]
    , ['GET', new RegExp('^/wd/hub/session/[^/]+/ime')]
  ];
  this.curContext = this.defaultContext();
};

Selendroid.prototype.getSettings = deviceCommon.getSettings;
Selendroid.prototype.updateSettings = deviceCommon.updateSettings;

Selendroid.prototype.pushUnlock = androidController.pushUnlock;
Selendroid.prototype.unlock = androidController.unlock;

_.extend(Selendroid.prototype, androidCommon);
Selendroid.prototype._deviceConfigure = Device.prototype.configure;
Selendroid.prototype._setAndroidArgs = androidCommon.setAndroidArgs;
Selendroid.prototype.setAndroidArgs = function () {
  this._setAndroidArgs();
  this.args.systemPort = this.args.selendroidPort;
  this.proxyPort = this.args.systemPort;
};

Selendroid.prototype.start = function (cb) {
  logger.debug("Starting selendroid server");
  this.adb = new ADB(this.args);

  var modServerExists = false
    , modAppPkg = null
    , modServerTimestamp = null;

  var checkModServerExists = function (cb) {
    this.selendroidServerPath = path.resolve(this.args.tmpDir,
        'selendroid.' + this.args.appPackage + '.apk');
    modAppPkg = this.args.appPackage + '.selendroid';
    fs.stat(this.selendroidServerPath, function (err, stat) {
      modServerExists = !err;
      if (stat) {
        modServerTimestamp = stat.mtime.getTime();
      }
      cb();
    });
  }.bind(this);

  var checkServerResigned = function (cb) {
    if (modServerExists) {
      fs.stat(this.selendroidServerPath, function (err, stat) {
        if (stat && stat.mtime.getTime() > modServerTimestamp) {
          modServerExists = false;
        }
        cb();
      });
    } else {
      cb();
    }
  }.bind(this);

  var conditionalUninstallSelendroid = function (cb) {
    if (!modServerExists) {
      logger.debug("Rebuilt selendroid apk does not exist, uninstalling " +
                  "any instances of it on device to make way for new one");
      this.adb.uninstallApk(modAppPkg, cb);
    } else {
      logger.debug("Rebuilt selendroid apk exists, doing nothing");
      cb();
    }
  }.bind(this);

  var conditionalInsertManifest = function (cb) {
    if (!modServerExists) {
      logger.debug("Rebuilt selendroid server does not exist, inserting " +
                  "modified manifest");
      this.insertSelendroidManifest(this.serverApk, cb);
    } else {
      logger.debug("Rebuilt selendroid server already exists, no need to " +
                  "rebuild it with a new manifest");
      cb();
    }
  }.bind(this);

  var conditionalInstallSelendroid = function (cb) {
    this.adb.isAppInstalled(modAppPkg, function (e, installed) {
      if (!installed) {
        logger.debug("Rebuilt selendroid is not installed, installing it");
        this.adb.install(this.selendroidServerPath, cb);
      } else {
        logger.debug("Rebuilt selendroid is already installed");
        cb();
      }
    }.bind(this));
  }.bind(this);

  async.series([
    this.ensureServerExists.bind(this),
    this.prepareDevice.bind(this),
    this.checkInternetPermissionForApp.bind(this),
    this.packageAndLaunchActivityFromManifest.bind(this),
    checkModServerExists,
    conditionalInsertManifest,
    this.checkSelendroidCerts.bind(this),
    checkServerResigned,
    conditionalUninstallSelendroid,
    conditionalInstallSelendroid,
    this.extractStringsSelendroid.bind(this),
    this.uninstallApp.bind(this),
    this.installAppForTest.bind(this),
    this.forwardPort.bind(this),
    this.initUnicode.bind(this),
    this.pushSettingsApp.bind(this),
    this.pushUnlock.bind(this),
    this.unlock.bind(this),
    this.pushSelendroid.bind(this),
    this.waitForServer.bind(this)
  ], function (err) {
    if (err) return cb(err);
    async.series([
      this.createSession.bind(this),
      this.initAutoWebview.bind(this)
    ], function (err, res) {
      if (err) return cb(err);
      // `createSession` returns session id, so send that along
      cb(null, res[0]);
    });
  }.bind(this));
};

Selendroid.prototype.pushSelendroid = function (cb) {
  var instrumentWith = this.args.appPackage + ".selendroid/" +
                       "io.selendroid.ServerInstrumentation";
  this.adb.instrument(this.args.appPackage, this.args.appActivity, instrumentWith, cb);
};

Selendroid.prototype.checkInternetPermissionForApp = function (cb) {
  var apk = this.args.app;
  this.adb.hasInternetPermissionFromManifest(apk, function (err, hasInternetPermission) {
    if (err) return cb(err);
    if (hasInternetPermission) {
      return cb();
    }
    else {
      var errorMessg = "apk does not have INTERNET permissions. Selendroid needs internet " +
                       "permission to proceed, please check if you have <uses-permission " +
                       "android:name=\"android.**permission.INTERNET\"/> in your " +
                       "AndroidManifest.xml";
      cb(new Error(errorMessg));
    }
  });
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
    logger.debug("Checking signed status of " + apk);
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

Selendroid.prototype.stop = function (ocb) {
  var completeShutdown = function (cb) {
    if (this.args.unicodeKeyboard && this.args.resetKeyboard && this.defaultIME) {
      logger.debug('Resetting IME to \'' + this.defaultIME + '\'');
      this.adb.setIME(this.defaultIME, function (err) {
        if (err) {
          // simply warn on error here, because we don't want to stop the shutdown
          // process
          logger.warn(err);
        }
        logger.debug("Stopping selendroid server");
        this.deleteSession(cb);
      }.bind(this));
    } else {
      logger.debug("Stopping selendroid server");
      this.deleteSession(cb);
    }
  }.bind(this);

  completeShutdown(function (err) {
    if (err) return ocb(err);

    // Remove the app _after_ stopping Selendroid, or Selendroid will fail
    if (this.args.fullReset) {
      logger.debug("Removing app from device");
      this.uninstallApp(function (err) {
        if (err) {
          // simply warn on error here, because we don't want to stop the shutdown
          // process
          logger.warn(err);
        }
        ocb();
      });
    } else {
      ocb();
    }
  }.bind(this));
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
  logger.debug("Checking whether selendroid is built yet");
  var selBin = path.resolve(__dirname, "..", "..", "..", "build", "selendroid",
      "selendroid.apk");
  fs.stat(selBin, function (err) {
    if (err) {
      logger.debug("Selendroid needs to be built; please run ./reset.sh " +
                  "--selendroid");
      return cb(err);
    }
    logger.debug("Selendroid server exists!");
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
        logger.debug("Selendroid server is alive!");
        cb(null);
      }
    });
  }.bind(this);

  pingServer();
};

Selendroid.prototype.createSession = function (cb) {
  logger.debug("Listening for Selendroid logs");
  this.adb.logcat.on('log', function (logObj) {
    if (/System/.test(logObj.message)) {
      var type = "";
      if (/System\.err/.test(logObj.message)) {
        type = " ERR";
      }
      var msg = logObj.message.replace(/^.+: /, '');
      logger.debug("[SELENDROID" + type + "] " + msg);
    }
  }.bind(this));
  logger.debug("Creating Selendroid session");
  var data = {desiredCapabilities: this.capabilities};
  this.proxyTo('/wd/hub/session', 'POST', data, function (err, res, body) {
    if (err) return cb(err);

    if (res.statusCode === 301 && body.sessionId) {
      logger.debug("Successfully started selendroid session");
      this.selendroidSessionId = body.sessionId;
      this.proxySessionId = this.selendroidSessionId;
      this.adb.waitForActivity(this.args.appWaitPackage, this.args.appWaitActivity, 1800,
          function (err) {
        if (err) {
          logger.debug("Selendroid hasn't started app yet, let's do it " +
                      "manually with adb.startApp");
          var onStart = function (err) {
            if (err) return cb(err);
            return cb(null, body.sessionId);
          }.bind(this);

          return this.adb.startApp({
                   pkg: this.args.appPackage,
                   activity: this.args.appActivity,
                   action: this.args.intentAction,
                   category: this.args.intentCategory,
                   flags: this.args.intentFlags,
                   waitPkg: this.args.appWaitPackage,
                   waitActivity: this.args.appWaitActivity,
                   optionalIntentArguments: this.args.optionalIntentArguments,
                   retry: false
                 }, onStart);
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
  logger.debug("Inserting selendroid manifest");
  var newServerPath = this.selendroidServerPath
    , newPackage = this.args.appPackage + '.selendroid'
    , srcManifest = path.resolve(__dirname, '..', '..', '..', 'build',
        'selendroid', 'AndroidManifest.xml')
    , dstDir = path.resolve(this.args.tmpDir, this.args.appPackage)
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
  if (path.indexOf("contexts") !== -1) {
    logger.debug("Temporarily translating 'contexts' to 'window_handles");
    path = path.replace("contexts", "window_handles");
  } else if (path.indexOf("context") !== -1) {
    logger.debug("Temporarily translating 'context' to 'window'");
    path = path.replace("context", "window");
  }
  req.originalUrl = path;
};

Selendroid.prototype.extractStringsSelendroid = function (cb) {
  this.extractStrings(function () {
    cb();
  });
};

Selendroid.prototype.getStrings = function (language, cb) {
  if (this.language && this.language === language) {
    // Return last strings
    return cb(null, {
      status: status.codes.Success.code,
      value: this.apkStrings
    });
  }

  // Extract and return strings
  return this.extractStrings(function () {
    cb(null, {
      status: status.codes.Success.code,
      value: this.apkStrings
    });
  }.bind(this), language);
};


_.extend(Selendroid.prototype, androidHybrid);
_.extend(Selendroid.prototype, androidContextController);


Selendroid.prototype.isChromedriverContext = function (windowName) {
  return windowName === this.CHROMIUM_WIN;
};

Selendroid.prototype.getContexts = function (cb) {
  var chromiumViews = [];
  this.listWebviews(function (err, webviews) {
    if (err) return cb(err);
    if (_.contains(webviews, this.CHROMIUM_WIN)) {
      chromiumViews = [this.CHROMIUM_WIN];
    } else {
      chromiumViews = [];
    }

    var selendroidViews = [];
    var reqUrl = this.selendroidHost + ':' + this.args.selendroidPort + '/wd/hub/session/' + this.selendroidSessionId;
    doRequest(reqUrl + '/window_handles', 'GET', {}, null, function (err, res) {
      if (err) return cb(err);
      selendroidViews = JSON.parse(res.body).value;
      this.contexts = _.union(selendroidViews, chromiumViews);
      logger.debug("Available contexts: " + JSON.stringify(this.contexts));
      cb(null, {sessionId: this.selendroidSessionId, status: status.codes.Success.code, value: this.contexts});
    }.bind(this));
  }.bind(this));
};

Selendroid.prototype.defaultWebviewName = function () {
  return this.WEBVIEW_WIN + "_0";
};

Selendroid.prototype.setValue = function (elementId, value, cb) {
  logger.debug('Setting text on element \'' + elementId + '\': \'' + value + '\'');
  for (var i = 0; i < value.length; i++) {
    var c = value.charCodeAt(i);
    // if we're using the unicode keyboard, and this is unicode, maybe encode
    if (this.args.unicodeKeyboard && (c > 127 || c === 38)) {
      // this is not simple ascii, or it is an ampersand (`&`)
      if (c >= parseInt("E000", 16) && c <= parseInt("E040", 16)) {
        // Selenium uses a Unicode PUA to cover certain special characters
        // see https://code.google.com/p/selenium/source/browse/java/client/src/org/openqa/selenium/Keys.java
      } else {
        // encode the text
        value = utf7.encode(value);
        break;
      }
    }
  }
  var reqUrl = this.proxyHost + ':' + this.proxyPort +
      '/wd/hub/session/' + this.selendroidSessionId +
      '/element/' + elementId + '/value';
  doRequest(reqUrl, 'POST', { value: [value] }, null, function (err) {
    if (err) return cb(err);
    cb(null, {
      status: status.codes.Success.code,
      value: ''
    });
  });
};

module.exports = Selendroid;
