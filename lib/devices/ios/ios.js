"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , ncp = require('ncp').ncp
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , sock = '/tmp/instruments_sock'
  , glob = require('glob')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
  , xmlplist = require('plist')
  , Device = require('../device.js')
  , Instruments = require('./instruments.js')
  , helpers = require('../../helpers.js')
  , checkPreferencesApp = helpers.checkPreferencesApp
  , getiOSSDKVersion = helpers.getiOSSDKVersion
  , errors = require('../../server/errors.js')
  , deviceCommon = require('../common.js')
  , iOSLog = require('./ios-log.js')
  , iOSCrashLog = require('./ios-crash-log.js')
  , status = require("../../server/status.js")
  , iDevice = require('node-idevice')
  , async = require('async')
  , iOSController = require('./ios-controller.js')
  , iOSHybrid = require('./ios-hybrid.js')
  , settings = require('./settings.js')
  , mkdirp = require('mkdirp')
  , getSimRoot = settings.getSimRoot
  , fruitstrap = path.resolve(__dirname, '../../../build/fruitstrap/fruitstrap')
  , uiauto = require('appium-uiauto')
  , UnknownError = errors.UnknownError;

// XML Plist library helper
var xmlPlistFile = function (filename, callback) {
  try {
    var result = xmlplist.parseFileSync(filename);
    return callback(null, result);
  } catch (ex) {
    return callback(ex);
  }
};

var IOS = function () {
  this.init();
};

_.extend(IOS.prototype, Device.prototype);

IOS.prototype._deviceInit = Device.prototype.init;
IOS.prototype.init = function () {
  this._deviceInit();
  this.appExt = ".app";
  this.capabilities = {
    webStorageEnabled: false
  , locationContextEnabled: false
  , browserName: 'iOS'
  , platform: 'MAC'
  , javascriptEnabled: true
  , databaseEnabled: false
  , takesScreenshot: true
  };
  this.xcodeFolder = null;
  this.xcodeVersion = null;
  this.iOSSDKVersion = null;
  this.iosSimProcess = null;
  this.logs = {};
  this.instruments = null;
  this.initQueue();
  this.onInstrumentsDie = function () {};
  this.stopping = false;
  this.cbForCurrentCmd = null;
  this.remote = null;
  this.curContext = null;
  this.curWebFrames = [];
  this.selectingNewPage = false;
  this.processingRemoteCmd = false;
  this.windowHandleCache = [];
  this.webElementIds = [];
  this.implicitWaitMs = 0;
  this.asyncWaitMs = 0;
  this.asyncResponseCb = null;
  this.returnedFromExecuteAtom = {};
  this.executedAtomsCounter = 0;
  this.curCoords = null;
  this.curWebCoords = null;
  this.onPageChangeCb = null;
  this.dontDeleteSimApps = false;
  this.landscapeWebCoordsOffset = 0;
  this.supportedStrategies = ["name", "tag name", "xpath", "id",
                              "-ios uiautomation", "class name",
                              "accessibility id", "-real xpath"];
  this.localizableStrings = {};
  this.keepAppToRetainPrefs = false;
};

IOS.prototype._deviceConfigure = Device.prototype.configure;
IOS.prototype.configure = function (args, caps, cb) {
  var msg;
  this._deviceConfigure(args, caps);
  this.setIOSArgs();

  if (this.args.locationServicesAuthorized && !this.args.bundleId) {
    msg = "You must set the bundleId cap if using locationServicesEnabled";
    logger.error(msg);
    return cb(new Error(msg));
  }

  if (this.args.app) {
    return this.configureApp(cb);
  }

  msg = "No app set; either start appium with --app or use 'app' cap";
  logger.error(msg);
  cb(new Error(msg));
};

IOS.prototype.setIOSArgs = function () {
  this.args.withoutDelay = !this.args.nativeInstrumentsLib;
  this.args.reset = !this.args.noReset;
  this.args.removeTraceDir = !this.args.keepArtifacts;
  this.args.deviceName = this.args.deviceName || this.args.platformName;
  this.args.initialOrientation = this.capabilities.deviceOrientation ||
                                 this.args.orientation ||
                                 "PORTRAIT";
  this.useRobot = this.args.robotPort > 0;
  this.args.robotUrl = this.useRobot ?
    "http://" + this.args.robotAddress + ":" + this.args.robotPort + "" :
    null;
  this.curOrientation = this.args.initialOrientation;
};

IOS.prototype.configureApp = function (cb) {
  var _cb = cb;
  cb = function (err) {
    if (err) {
      err = new Error("Bad app: " + this.args.app + ". App paths need to be " +
                      "absolute, or relative to the appium server install " +
                      "dir, or a URL to compressed file, or a special app " +
                      "name. cause: " + err);
    }
    _cb(err);
  }.bind(this);
  var app = this.appString();
  if (app.toLowerCase() === "iwebview") {
    this.capabilities.iwebview = true;
    this.args.app = path.resolve(__dirname,
      "../../../build/WebViewApp/WebViewApp.app");
    Device.prototype.configureApp.call(this, cb);
  } else if (app.toLowerCase() === "settings") {
    this.configurePreferences(cb);
  } else if (this.appIsPackageOrBundle(app)) {
    // we have a bundle ID
    logger.info("App is an iOS bundle, will attempt to run as pre-existing");
    this.args.bundleId = app;
    this.args.app = null;
    cb();
  } else {
    Device.prototype.configureApp.call(this, cb);
  }
};

IOS.prototype.configurePreferences = function (cb) {
  logger.info("Configuring settings app");
  var prefsVer = null;
  if (typeof this.args.platformVersion !== "undefined" &&
      this.args.platformVersion) {
    prefsVer = this.args.platformVersion;
  }

  var sdkNext = function (prefsVer) {
    logger.info("Trying to use settings app, version " + prefsVer);
    checkPreferencesApp(prefsVer, function (err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare settings app with version '" +
                     prefsVer + "': " + err);
        return cb(err);
      }
      logger.info("Using settings app at " + attemptedApp);
      this.args.app = attemptedApp;
      this.args.origAppPath = origApp;
      cb();
    }.bind(this));
  }.bind(this);

  if (prefsVer === null) {
    getiOSSDKVersion(function (err, prefsVer) {
      if (err) return cb(err);
      sdkNext(prefsVer);
    });
  } else {
    sdkNext(prefsVer);
  }
};

IOS.prototype.preCleanup = function (cb) {
  var removeTracedirs = function (innerCb) {
    if (this.args.removeTraceDir) {
      logger.info("Cleaning up any tracedirs");
      glob("*.trace", {}, function (err, files) {
        if (err) {
          logger.error("Could not glob for tracedirs: " + err.message);
          innerCb(err);
        } else {
          if (files.length > 0) {
            var filesDone = 0;
            var onDelete = function () {
              filesDone++;
              if (filesDone === files.length) {
                innerCb();
              }
            };
            _.each(files, function (file) {
              file = path.resolve(process.cwd(), file);
              rimraf(file, function (err) {
                if (err) {
                  logger.warn("Problem cleaning up file: " + err.message);
                } else {
                  logger.info("Cleaned up " + file);
                }
                onDelete();
              });
            });
          } else {
            logger.info("No tracedirs to clean up");
            innerCb();
          }
        }
      });
    } else {
      innerCb();
    }
  }.bind(this);

  var removeSocket = function (innerCb) {
    logger.info("Removing any remaining instruments sockets");
    rimraf(sock, function (err) {
      if (err) return innerCb(err);
      logger.info("Cleaned up instruments socket " + sock);
      innerCb();
    });
  }.bind(this);

  async.series([removeSocket, removeTracedirs], cb);
};

IOS.prototype.getNumericVersion = function () {
  return parseFloat(this.args.platformVersion);
};

IOS.prototype.start = function (cb, onDie) {
  if (this.instruments !== null) {
    var msg = "Trying to start a session but instruments is still around";
    logger.error(msg);
    return cb(new Error(msg));
  }

  if (typeof onDie === "function") {
    this.onInstrumentsDie = onDie;
  }

  async.series([
    this.preCleanup.bind(this),
    this.setXcodeFolder.bind(this),
    this.setXcodeVersion.bind(this),
    this.setiOSSDKVersion.bind(this),
    this.detectTraceTemplate.bind(this),
    this.detectUdid.bind(this),
    this.parseLocalizableStrings.bind(this),
    this.setLocale.bind(this),
    this.createInstruments.bind(this),
    this.setPreferences.bind(this),
    this.startLogCapture.bind(this),
    this.setDeviceAndLaunchSimulator.bind(this),
    this.installToRealDevice.bind(this),
    this.startInstruments.bind(this),
    this.onInstrumentsLaunch.bind(this),
    this.setBundleId.bind(this),
    this.setBootstrapConfig.bind(this),
    this.setInitialOrientation.bind(this),
  ], function (err) {
    cb(err);
  });
};

IOS.prototype.createInstruments = function (cb) {
  logger.debug("Creating instruments");
  this.instruments = this.makeInstruments();
  cb();
};

IOS.prototype.startInstruments = function (cb) {
  logger.debug("Starting instruments");
  this.instruments.start(function (err) {
    if (err) {
      if (!_.isEmpty(this.logs)) {
        this.logs.syslog.stopCapture();
        this.logs = {};
      }
      this.postCleanup(function () {
        cb(err);
      });
    } else {
      cb();
    }
  }.bind(this), function (code, tracedir) {
    this.onUnexpectedInstrumentsExit(code, tracedir);
  }.bind(this));
};

IOS.prototype.makeInstruments = function () {
  return new Instruments({
    app: this.args.app || this.args.bundleId
  , udid: this.args.udid
  , processArguments: this.args.processArguments
  , ignoreStartupExit: this.shouldIgnoreInstrumentsExit()
  , bootstrap: uiauto.bootstrap
  , template: this.args.automationTraceTemplatePath
  , sock: sock
  , withoutDelay: this.args.withoutDelay
  , xcodeVersion: this.xcodeVersion
  , webSocket: this.args.webSocket
  , launchTimeout: this.args.launchTimeout
  , flakeyRetries: this.args.backendRetries
  , simulatorSdkAndDevice: this.iOSSDKVersion >= 7.1 ? this.getDeviceString() : null
  });
};

IOS.prototype.shouldIgnoreInstrumentsExit = function () {
  return false;
};

IOS.prototype.onInstrumentsLaunch = function (cb) {
  logger.info('Instruments launched. Starting poll loop for new commands.');
  this.instruments.setDebug(true);
  if (this.args.origAppPath) {
    logger.info("Copying app back to its original place");
    return ncp(this.args.app, this.args.origAppPath, cb);
  }

  cb();
};

IOS.prototype.setBundleId = function (cb) {
  if (this.args.bundleId) {
    cb();
  } else {
    this.proxy('au.bundleId()', function (err, bId) {
      if (err) return cb(err);
      logger.info('Bundle ID for open app is ' + bId.value);
      this.args.bundleId = bId.value;
      cb();
    }.bind(this));
  }
};

IOS.prototype.setInitialOrientation = function (cb) {
  if (typeof this.args.initialOrientation === "string" &&
      _.contains(["LANDSCAPE", "PORTRAIT"],
                 this.args.initialOrientation.toUpperCase())
      ) {
    logger.info("Setting initial orientation to " + this.args.initialOrientation);
    var command = ["au.setScreenOrientation('",
      this.args.initialOrientation.toUpperCase(), "')"].join('');
    this.proxy(command, function (err, res) {
      if (err || res.status !== status.codes.Success.code) {
        logger.warn("Setting initial orientation did not work!");
      } else {
        this.curOrientation = this.args.initialOrientation;
      }
      cb();
    }.bind(this));
  } else {
    cb();
  }
};

IOS.prototype.setBootstrapConfig = function (cb) {
  logger.info("Setting bootstrap config keys/values");
  var autoAcceptAlerts = !(!this.args.autoAcceptAlerts || this.args.autoAcceptAlerts === 'false');
  var cmd = "setBootstrapConfig: autoAcceptAlerts=" + autoAcceptAlerts;
  this.proxy(cmd, function (err) {
    cb(err); // discard res
  });
};

IOS.prototype.onUnexpectedInstrumentsExit = function (code, traceDir) {
  logger.info("Instruments exited unexpectedly");
  if (typeof this.cbForCurrentCmd === "function") {
    // we were in the middle of waiting for a command when it died
    // so let's actually respond with something
    var error = new UnknownError("Instruments died while responding to " +
                                 "command, please check appium logs");
    this.cbForCurrentCmd(error, null);
    if (!code) {
      code = 1; // this counts as an error even if instruments doesn't think so
    }
  }
  this.shutdown(code, traceDir, this.onInstrumentsDie);
};

IOS.prototype.setXcodeFolder = function (cb) {
  logger.info("Setting Xcode folder");
  helpers.getXcodeFolder(function (err, xcodeFolder) {
    if (err) {
      logger.error("Could not determine Xcode folder");
    }
    this.xcodeFolder = xcodeFolder;
    cb();
  }.bind(this));
};

IOS.prototype.setXcodeVersion = function (cb) {
  logger.info("Setting Xcode version");
  helpers.getXcodeVersion(function (err, versionNumber) {
    if (err) {
      logger.error("Could not determine Xcode version");
    }
    this.xcodeVersion = versionNumber;
    if (this.xcodeVersion === "5.0.1") {
      cb(new Error("Xcode 5.0.1 ships with a broken version of Instruments. " +
                   "please upgrade to 5.0.2"));
    } else {
      cb();
    }
  }.bind(this));
};

IOS.prototype.setiOSSDKVersion = function (cb) {
  logger.info("Setting iOS SDK Version");
  helpers.getiOSSDKVersion(function (err, versionNumber) {
    if (err) {
      logger.error("Could not determine iOS SDK version");
    }
    this.iOSSDKVersion = versionNumber;
    logger.info("iOS SDK Version set to " + this.iOSSDKVersion);
    cb();
  }.bind(this));
};

IOS.prototype.setLocale = function (cb) {
  var msg;

  var setLoc = function (err) {
    if (err) return cb(err);
    var iosSimLocalePath = path.resolve(__dirname, "../../../build/ios-sim-locale");
    if (this.args.fullReset) {
      msg = "Cannot set locale information because a full-reset was requested";
      logger.error(msg);
      return cb(new Error(msg));
    }
    if (fs.existsSync(iosSimLocalePath)) {
      helpers.getiOSSimulatorDirectories(function (err, pathList) {
        if (err || typeof pathList  === 'undefined' || pathList.length < 1) {
          msg = "Cannot set locale information because the iOS Simulator directory could not be determined.";
          logger.error(msg);
          cb(new Error(msg));
        } else {
          var localeInfoWasSet = false;
          var setLanguageForPath = function (pathIndex) {
            if (pathIndex >= pathList.length) {
              if (localeInfoWasSet) {
                logger.info("Locale was set");
                cb();
              } else {
                msg = "Appium was unable to set locale info.";
                logger.error(msg);
                cb(new Error(msg));
              }
            } else {
              var sdkVersion = pathList[pathIndex].split(path.sep).pop();
              var cmd = iosSimLocalePath + ' -sdk ' + sdkVersion;
              cmd = (this.args.language) ? cmd + ' -language ' + this.args.language : cmd;
              cmd = (this.args.locale) ? cmd + ' -locale ' + this.args.locale : cmd;
              cmd = (this.args.calendarFormat) ? cmd + ' -calendar ' + this.args.calendarFormat : cmd;
              logger.info("Setting locale with command " + cmd);
              exec(cmd, { maxBuffer: 524288 }, function (err) {
                if (err === null) {
                  localeInfoWasSet = true;
                }
                setLanguageForPath(pathIndex + 1);
              });
            }
          }.bind(this);
          setLanguageForPath(0);
        }
      }.bind(this));
    } else {
      msg = "Could not set locale information because the ios-sim-locale was not found at " + iosSimLocalePath;
      logger.error(msg);
      cb(new Error(msg));
    }
  }.bind(this);

  if ((this.args.language || this.args.locale || this.args.calendarFormat) && this.args.udid === null) {
    if (!settings.simDirsExist(this.iOSSDKVersion)) {
      this.instantLaunchAndQuit(setLoc);
    } else {
      setLoc();
    }
  } else if (this.args.udid) {
    logger.info("Not setting locale because we're using a real device");
    cb();
  } else {
    logger.info("Not setting locale");
    cb();
  }
};

IOS.prototype.setPreferences = function (cb) {
  if (this.args.udid !== null) {
    logger.info("Not setting iOS and app preferences since we're on a real " +
                "device");
    return cb();
  }

  var settingsCaps = [
    'locationServicesEnabled',
    'locationServicesAuthorized',
    'safariAllowPopups',
    'safariIgnoreFraudWarning',
    'safariOpenLinksInBackground'
  ];
  var safariSettingsCaps = settingsCaps.slice(2, 5);
  var needToSet = false;
  var needToSetSafari = false;
  _.each(settingsCaps, function (cap) {
    if (_.has(this.capabilities, cap)) {
      needToSet = true;
      if (_.contains(safariSettingsCaps, cap)) {
        needToSetSafari = true;
        this.keepAppToRetainPrefs = true;
      }
    }
  }.bind(this));

  if (!needToSet) {
    logger.info("No iOS / app preferences to set");
    return cb();
  } else if (this.args.fullReset) {
    var msg = "Cannot set preferences because a full-reset was requested";
    logger.info(msg);
    logger.error(msg);
    return cb(new Error(msg));
  }

  var setPrefs = function (err) {
    if (err) return cb(err);
    try {
      this.setLocServicesPrefs();
    } catch (e) {
      logger.error("Error setting location services preferences, prefs will not work");
      logger.error(e);
      logger.error(e.stack);
    }
    try {
      this.setSafariPrefs();
    } catch (e) {
      logger.error("Error setting safari preferences, prefs will not work");
      logger.error(e);
      logger.error(e.stack);
    }
    cb();
  }.bind(this);

  logger.info("Setting iOS and app preferences");
  if (!settings.simDirsExist(this.iOSSDKVersion) ||
      (needToSetSafari && !settings.safari7DirsExist(this.iOSSDKVersion))) {
    this.instantLaunchAndQuit(setPrefs);
  } else {
    setPrefs();
  }
};

IOS.prototype.instantLaunchAndQuit = function (cb) {
  logger.info("Sim files for the " + this.iOSSDKVersion + " SDK do not yet exist, launching the sim " +
      "to populate the applications and preference dirs");
  this.setDeviceAndLaunchSimulator(function (err) {
    if (err) return cb(err);
    var instrumentsIsDeadLongLiveInstruments = this.makeInstruments();
    instrumentsIsDeadLongLiveInstruments.launchAndKill(1000, function (err) {
      if (err) return cb(err);
      this.endSimulator(cb);
    }.bind(this));
  }.bind(this));
};

IOS.prototype.setLocServicesPrefs = function () {
  if (typeof this.capabilities.locationServicesEnabled !== "undefined" ||
      this.capabilities.locationServicesAuthorized) {
    var locServ = this.capabilities.locationServicesEnabled;
    locServ = locServ || this.capabilities.locationServicesAuthorized;
    locServ = locServ ? 1 : 0;
    logger.info("Setting location services to " + locServ);
    settings.updateSettings(this.iOSSDKVersion, 'locationServices', {
      LocationServicesEnabled: locServ,
      'LocationServicesEnabledIn7.0': locServ
    });
  }
  if (typeof this.capabilities.locationServicesAuthorized !== "undefined") {
    if (!this.args.bundleId) {
      var msg = "Can't set location services for app without bundle ID";
      logger.error(msg);
      throw new Error(msg);
    }
    var locAuth = !!this.capabilities.locationServicesAuthorized;
    if (locAuth) {
      logger.info("Authorizing location services for app");
    } else {
      logger.info("De-authorizing location services for app");
    }
    settings.updateLocationSettings(this.iOSSDKVersion, this.args.bundleId, locAuth);
    this.keepAppToRetainPrefs = true;
  }
};


IOS.prototype.setSafariPrefs = function () {
  var safariSettings = {};
  var val;
  if (_.has(this.capabilities, 'safariAllowPopups')) {
    val = !!this.capabilities.safariAllowPopups;
    logger.info("Setting javascript window opening to " + val);
    safariSettings.WebKitJavaScriptCanOpenWindowsAutomatically = val;
  }
  if (_.has(this.capabilities, 'safariIgnoreFraudWarning')) {
    val = !this.capabilities.safariIgnoreFraudWarning;
    logger.info("Setting fraudulent website warning to " + val);
    safariSettings.WarnAboutFraudulentWebsites = val;
  }
  if (_.has(this.capabilities, 'safariOpenLinksInBackground')) {
    val = this.capabilities.safariOpenLinksInBackground ? 1 : 0;
    logger.info("Setting opening links in background to " + !!val);
    safariSettings.OpenLinksInBackground = val;
  }
  if (_.size(safariSettings) > 0) {
    settings.updateSafariSettings(this.iOSSDKVersion, safariSettings);
    this.dontDeleteSimApps = true;
  }
};

IOS.prototype.detectTraceTemplate = function (cb) {
  logger.info("Detecting automation tracetemplate");
  var msg;
  if (!this.args.automationTraceTemplatePath) {
    helpers.getXcodeFolder(function (err, xcodeFolderPath) {
      if (err) return cb(err);
      if (xcodeFolderPath !== null) {
        var xcodeTraceTemplatePath = path.resolve(xcodeFolderPath,
          "../Applications/Instruments.app/Contents/PlugIns",
          "AutomationInstrument.bundle/Contents/Resources",
          "Automation.tracetemplate");
        if (fs.existsSync(xcodeTraceTemplatePath)) {
          this.args.automationTraceTemplatePath = xcodeTraceTemplatePath;
          cb();
        } else {
          msg = "Could not find Automation.tracetemplate in " +
                xcodeTraceTemplatePath;
          logger.error(msg);
          cb(new Error(msg));
        }
      } else {
        msg = "Could not find Automation.tracetemplate because XCode " +
              "could not be found. Try setting the path with xcode-select.";
        logger.error(msg);
        cb(new Error(msg));
      }
    }.bind(this));
  } else {
    cb();
  }
};

IOS.prototype.detectUdid = function (cb) {
  if (this.args.udid !== null && this.args.udid === "auto") {
    logger.info("Auto-detecting iOS udid...");
    var udidetectPath = path.resolve(__dirname, "../../../build/udidetect/udidetect");
    var udiddetectProc = exec(udidetectPath, { maxBuffer: 524288, timeout: 3000 }, function (err, stdout) {
      if (stdout && stdout.length > 2) {
        this.args.udid = stdout.replace("\n", "");
        logger.info("Detected udid as " + this.args.udid);
        cb();
      } else {
        logger.error("Could not detect udid.");
        cb(new Error("Could not detect udid."));
      }
    }.bind(this));
    udiddetectProc.on('timeout', function () {
      logger.error("Timed out trying to detect udid.");
      cb(new Error("Timed out trying to detect udid."));
    });
  } else {
    logger.info("Not auto-detecting udid, running on sim");
    cb();
  }
};

IOS.prototype.installToRealDevice = function (cb) {
  // if user has passed in desiredCaps.autoLaunch = false
  // meaning they will manage app install / launching
  if (this.args.autoLaunch === false) {
    cb();
  } else {
    if (this.args.udid) {
      if (this.args.ipa && this.args.bundleId) {
        this.installIpa(cb);
      } else if (this.args.ipa) {
        var msg = "You specified a UDID and ipa but did not include the bundle " +
                  "id";
        logger.error(msg);
        cb(new Error(msg));
      } else if (this.args.app) {
        try {
          this.realDevice = this.getIDeviceObj();
        } catch (e) {
          return cb(e);
        }
        this.installApp(this.args.app, cb);
      } else {
        logger.debug("Real device specified but no ipa or app path, assuming bundle ID is " +
                     "on device");
        cb();
      }
    } else {
      logger.debug("No device id or app, not installing to real device.");
      cb();
    }
  }
};

IOS.prototype.getIDeviceObj = function () {
  var idiPath = path.resolve(__dirname, "../../../build/",
                             "libimobiledevice-macosx/ideviceinstaller");
  logger.info("Creating iDevice object with udid " + this.args.udid);
  try {
    return iDevice(this.args.udid);
  } catch (e1) {
    logger.info("Couldn't find ideviceinstaller, trying built-in at " +
                idiPath);
    try {
      return iDevice(this.args.udid, {cmd: idiPath});
    } catch (e2) {
      var msg = "Could not initialize ideviceinstaller; make sure it is " +
                "installed and works on your system";
      logger.error(msg);
      throw new Error(msg);
    }
  }
};

IOS.prototype.installIpa = function (cb) {
  logger.info("Installing ipa found at " + this.args.ipa);
  this.realDevice = this.getIDeviceObj();
  var d = this.realDevice;
  async.waterfall([
    function (cb) { d.isInstalled(this.args.bundleId, cb); }.bind(this),
    function (installed, cb) {
      if (installed) {
        logger.info("Bundle found on device, removing before reinstalling.");
        d.remove(this.args.bundleId, cb);
      } else {
        logger.debug("Nothing found on device, going ahead and installing.");
        cb();
      }
    }.bind(this),
    function (cb) { d.installAndWait(this.args.ipa, this.args.bundleId, cb); }.bind(this)
  ], cb);
};

IOS.prototype.getDeviceString = function () {
  var isiPhone = this.args.forceIphone || this.args.forceIpad === null || (this.args.forceIpad !== null && !this.args.forceIpad);
  var isTall = isiPhone;
  var isRetina = this.xcodeVersion[0] !== '4';
  var is64bit = false;
  if (this.args.deviceName) {
    var device = this.args.deviceName.toLowerCase();
    if (device.indexOf("iphone") !== -1) {
      isiPhone = true;
    } else if (device.indexOf("ipad") !== -1) {
      isiPhone = false;
    }
    if (this.args.deviceName !== this.args.platformName) {
      isTall = isiPhone && (device.indexOf("4-inch") !== -1);
      isRetina =  (device.indexOf("retina") !== -1);
      is64bit = (device.indexOf("64-bit") !== -1);
    }
  }

  var iosDeviceString = isiPhone ? "iPhone" : "iPad";
  if (this.xcodeVersion[0] === '4') {
    if (isiPhone && isRetina) {
      iosDeviceString += isTall ? " (Retina 4-inch)" : " (Retina 3.5-inch)";
    } else {
      iosDeviceString += isRetina ? " (Retina)" : "";
    }
  } else {
    iosDeviceString += isRetina ? " Retina" : "";
    if (isiPhone) {
      if (isRetina && isTall) {
        iosDeviceString += is64bit ? " (4-inch 64-bit)" : " (4-inch)";
      } else if (this.args.deviceName.toLowerCase().indexOf("3.5") !== -1) {
        iosDeviceString += " (3.5-inch)";
      }
    } else {
      iosDeviceString += is64bit ? " (64-bit)" : "";
    }
  }
  if (this.iOSSDKVersion >= 7.1) {
    iosDeviceString += " - Simulator - iOS " +
                       (this.args.platformVersion || this.iOSSDKVersion);
  }
  return iosDeviceString;
};

IOS.prototype.setDeviceTypeInInfoPlist = function (deviceTypeCode, cb) {
  var plist = path.resolve(this.args.app, "Info.plist");
  bplistParse.parseFile(plist, function (err, obj) {
    var newPlist;
    if (err) {
      xmlPlistFile(plist, function (err, obj) {
        if (err) {
          logger.error("Could not parse plist file at " + plist);
          cb(err);
          return;
        } else {
          logger.info("Parsed app Info.plist");
          obj.UIDeviceFamily = [deviceTypeCode];
          newPlist = xmlplist.build(obj);
        }
      });
    } else {
      logger.info("Parsed app Info.plist");
      obj[0].UIDeviceFamily = [deviceTypeCode];
      newPlist = bplistCreate(obj);
    }
    fs.writeFile(plist, newPlist, function (err) {
      if (err) {
        logger.error("Could not save new Info.plist");
        cb(err);
      } else {
        logger.info("Wrote new app Info.plist with device type");
        cb();
      }
    });
  });
};

IOS.prototype.checkDeviceAvailable = function (cb) {
  if (this.iOSSDKVersion >= 7.1) {
    logger.debug("Checking whether instruments supports our device string");
    this.instruments.getAvailableDevices(function (err, availDevices) {
      var dString = this.getDeviceString();
      if (err) return cb(err);
      if (!_.contains(availDevices, dString)) {
        var msg = "Could not find a device to launch. You requested '" +
                  dString + "', but the available devices were: " +
                  JSON.stringify(availDevices);
        logger.error(msg);
        return cb(new Error(msg));
      }
      cb();
    }.bind(this));
  } else {
    logger.debug("Instruments v < 7.1, not checking device string support");
    cb();
  }
};


IOS.prototype.setDeviceAndLaunchSimulator = function (cb) {
  var msg;
  if (this.args.udid) {
    logger.info("Not setting device type since we're connected to a device");
    cb();
  } else if (!this.args.app && this.args.bundleId) {
    logger.info("Not setting device type since we're using bundle ID and " +
                "assuming app is already installed");
    cb(null);
  } else if (!this.args.deviceName && this.args.forceIphone === null && this.args.forceIpad === null) {
    logger.info("No device specified, current device in the iOS simulator will be used.");
    cb(null);
  } else if (this.args.defaultDevice) {
    logger.info("User specified default device, letting instruments launch it");
    this.checkDeviceAvailable(function (err) {
      if (err) return cb(err);
      var iosDeviceString = this.getDeviceString();
      var isiPhone = iosDeviceString.toLowerCase().indexOf("ipad") === -1;
      this.setDeviceTypeInInfoPlist(isiPhone ? 1 : 2, cb);
    }.bind(this));
  } else {
    var iosSimPath = path.resolve(this.xcodeFolder, "Platforms/iPhoneSimulator.platform/Developer/Applications" +
      "/iPhone Simulator.app/Contents/MacOS/iPhone Simulator");
    if (!fs.existsSync(iosSimPath)) {
      msg = "Could not find ios simulator binary at " + iosSimPath;
      logger.error(msg);
      cb(new Error(msg));
    } else {

      var cleanup = function (cb) {
        if ((this.args.fullReset || this.args.reset) && this.dontDeleteSimApps) {
          logger.info("Not deleting simulator apps since we need to update " +
                      "their plists before launch");
          return cb();
        }
        if (this.args.fullReset) {
          this.deleteSim(cb);
        } else if (this.args.reset) {
          this.cleanupAppState(cb);
        } else {
          cb();
        }
      }.bind(this);

      var setDeviceInfo = function (cb) {
        var isiPhone = this.getDeviceString().toLowerCase().indexOf("ipad") === -1;
        this.setDeviceTypeInInfoPlist(isiPhone ? 1 : 2, cb);
      }.bind(this);

      var startSim = function (cb) {
        logger.debug("Launching device: " + this.getDeviceString());
        var iosSimArgs = ["-SimulateDevice", this.getDeviceString()];
        this.iosSimProcess = spawn(iosSimPath, iosSimArgs);
        var waitForSimulatorLogs = function (countdown) {
          if (countdown <= 0 || (this.logs.syslog && (this.logs.syslog.getAllLogs().length > 0 ||
            (this.logs.crashlog && this.logs.crashlog.getAllLogs().length > 0)))) {
            logger.info(countdown > 0 ? "Simulator is now ready." : "Waited 10 seconds for simulator to start.");
            cb();
          } else {
            setTimeout(function () {
              waitForSimulatorLogs(countdown - 1);
            }, 1000);
          }
        }.bind(this);
        waitForSimulatorLogs(10);
      }.bind(this);

      if (this.iOSSDKVersion < 7.1) {
        async.series([
          this.endSimulator.bind(this),
          cleanup,
          setDeviceInfo,
          startSim
        ], function (err) {
          cb(err);
        });
      } else {
        async.series([
          this.endSimulator.bind(this),
          this.checkDeviceAvailable.bind(this),
          cleanup,
        ], function (err) {
          cb(err);
        });
      }
    }
  }
};

IOS.prototype.parseLocalizableStrings = function (cb) {
  if (this.args.app === null) {
    logger.info("Localizable.strings is not currently supported when using real devices.");
    cb();
  } else {
    var strings = path.resolve(this.args.app, "Localizable.strings");

    if (!fs.existsSync(strings)) {
      strings = path.resolve(this.args.app, "en.lproj", "Localizable.strings");
    }

    bplistParse.parseFile(strings, function (err, obj) {
      if (err) {
        xmlPlistFile(strings, function (err, obj) {
          if (err) {
            logger.warn("Could not parse plist file at " + strings);
          } else {
            logger.info("Parsed app Localizable.strings");
            this.localizableStrings = obj;
          }
          cb();
        }.bind(this));
      } else {
        logger.info("Parsed app Localizable.strings");
        this.localizableStrings = obj;
        cb();
      }
    }.bind(this));
  }
};


IOS.prototype.getSimulatorApplications = function (cb) {
  var findCmd = 'find "' + getSimRoot() + '" -name "Applications"';
  exec(findCmd, function (err, stdout) {
    // Return empty array on error otherwise
    // "No such file or directory" will crash appium.
    if (err) return cb(null, []);
    var files = [];
    _.each(stdout.split("\n"), function (line) {
      if (line.trim()) {
        files.push(line.trim());
      }
    });
    cb(null, files);
  });
};


IOS.prototype.deleteSim = function (cb) {
  var simRoot = getSimRoot();
  logger.info("Deleting simulator folder: " + simRoot);
  if (fs.existsSync(simRoot)) {
    rimraf(simRoot, cb);
  } else cb();
};

IOS.prototype.cleanupAppState = function (cb) {
  logger.info("Cleaning app state.");
  this.getSimulatorApplications(function (err, files) {
    if (err) {
      logger.error("Could not remove: " + err.message);
      cb(err);
    } else {
      if (files.length) {
        try {
          _(files).each(function (file, i) {
            if (!this.keepAppToRetainPrefs) {
              rimraf.sync(file);
              logger.info("Deleted " + file);
              if (i === 0 && this.args.keepKeyChains) {
                mkdirp.sync(file);
              }
            }
            var root = path.dirname(file);
            var tcc = path.join(root, 'Library/TCC');
            if (fs.existsSync(tcc)) {
              rimraf.sync(tcc);
              logger.info("Deleted " + tcc);
            }

            var caches = path.join(root, 'Library/Caches/locationd');
            if (fs.existsSync(caches)) {
              rimraf.sync(caches);
              logger.info("Deleted " + caches);
            }

            var media = path.join(root, 'Media');
            if (fs.existsSync(media)) {
              rimraf.sync(media);
              logger.info("Deleted " + media);
            }

            var keychain = path.join(root, 'Library/Keychains');
            if (!this.args.keepKeyChains && fs.existsSync(keychain)) {
              rimraf.sync(keychain);
              logger.info("Deleted " + keychain);
            }
          }, this);
          cb();
        } catch (err) {
          cb(err);
        }
      } else {
        logger.info("No folders found to remove");
        if (this.realDevice && this.args.bundleId) {
          var bundleId = this.args.bundleId;
          this.realDevice.remove(bundleId, function (err) {
            if (err) {
              this.removeApp(bundleId, function (err) {
                if (err) {
                  logger.error("Could not remove " + bundleId + " from device");
                  cb(err);
                } else {
                  logger.info("Removed " + bundleId);
                  cb();
                }
              }.bind(this));
            } else {
              logger.info("Removed " + bundleId);
              cb();
            }
          }.bind(this));
        } else {
          cb();
        }
      }
    }
  }.bind(this));
};

IOS.prototype.postCleanup = function (cb) {
  this.curCoords = null;
  this.curOrientation = null;

  if (!_.isEmpty(this.logs)) {
    this.logs.syslog.stopCapture();
    this.logs = {};
  }

  if (this.remote) {
    this.stopRemote();
  }

  if (this.args.reset || this.args.fullReset) {
    // The simulator process must be ended before we delete applications.
    async.series([
      function (cb) { this.endSimulator(cb); }.bind(this),
      function (cb) {
        if (this.args.reset) {
          this.cleanupAppState(cb);
        } else {
          cb();
        }
      }.bind(this),
      function (cb) {
        if (this.args.fullReset) {
          this.deleteSim(cb);
        } else {
          cb();
        }
      }.bind(this),
    ], cb);
  } else {
    logger.info("Reset set to false, not ending sim or cleaning up app state");
    cb();
  }

};

IOS.prototype.endSimulator = function (cb) {
  logger.info("Killing the simulator process");
  if (this.iosSimProcess) {
    this.iosSimProcess.kill("SIGHUP");
    this.iosSimProcess = null;
    this.endSimulatorDaemons(cb);
  } else {
    var cmd = 'killall -9 "iPhone Simulator"';
    exec(cmd, { maxBuffer: 524288 }, function (err) {
      if (err && err.message.indexOf('matching processes') === -1) {
        cb(err);
      } else {
        this.endSimulatorDaemons(cb);
      }
    }.bind(this));
  }

};

IOS.prototype.endSimulatorDaemons = function (cb) {
  logger.info("Killing any other simulator daemons");
  var stopCmd = 'launchctl list | grep com.apple.iphonesimulator.launchd | cut -f 3 | xargs -n 1 launchctl stop';
  exec(stopCmd, { maxBuffer: 524288 }, function () {
    var removeCmd = 'launchctl list | grep com.apple.iphonesimulator.launchd | cut -f 3 | xargs -n 1 launchctl remove';
    exec(removeCmd, { maxBuffer: 524288 }, function () {
      cb();
    });
  });
};

IOS.prototype.stop = function (cb) {
  logger.info("Stopping ios");
  if (this.instruments === null) {
    logger.info("Trying to stop instruments but it already exited");
    this.postCleanup(cb);
  } else {
    this.instruments.shutdown(function (code, traceDir) {
      this.shutdown(code, traceDir, cb);
    }.bind(this));
  }
};

IOS.prototype.shutdown = function (code, traceDir, cb) {
  this.instruments = null;

  var removeTraceDir = function (cb) {
    if (this.args.removeTraceDir && traceDir) {
      rimraf(traceDir, function (err) {
        if (err) return cb(err);
        logger.info("Deleted tracedir we heard about from instruments (" +
                    traceDir + ")");
        cb();
      });
    } else {
      cb();
    }
  }.bind(this);

  async.series([
    removeTraceDir,
    this.postCleanup.bind(this)
  ], function () {
    cb();
  });

};

IOS.prototype.waitForCondition = deviceCommon.waitForCondition;
IOS.prototype.proxy = deviceCommon.proxy;
IOS.prototype.proxyWithMinTime = deviceCommon.proxyWithMinTime;
IOS.prototype.respond = deviceCommon.respond;

IOS.prototype.initQueue = function () {

  this.queue = async.queue(function (command, cb) {
    if (!this.instruments) return cb();
    async.series([
      function (cb) {
        async.whilst(
          function () { return this.selectingNewPage && this.curContext; }.bind(this),
          function (cb) {
            logger.info("We're in the middle of selecting a new page, " +
                        "waiting to run next command until done");
            setTimeout(cb, 100);
          },
          cb
        );
      }.bind(this),
      function (cb) {
        var matched = false;
        var matches = ["au.alertIsPresent", "au.getAlertText", "au.acceptAlert",
                       "au.dismissAlert", "au.setAlertText",
                       "au.waitForAlertToClose"];
        _.each(matches, function (match) {
          if (command.indexOf(match) === 0) {
            matched = true;
          }
        });
        async.whilst(
          function () { return  !matched && this.curContext && this.processingRemoteCmd; }.bind(this),
          function (cb) {
            logger.info("We're in the middle of processing a remote debugger " +
                        "command, waiting to run next command until done");
            setTimeout(cb, 100);
          },
          cb
        );
      }.bind(this)
    ], function (err) {
      if (err) return cb(err);
      this.cbForCurrentCmd = cb;
      if (this.instruments) {
        logger.debug("Sending command to instruments: " + command);
        this.instruments.sendCommand(command, function (response) {
          this.cbForCurrentCmd = null;
          if (typeof cb === 'function') {
            this.respond(response, cb);
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this), 1);
};

IOS.prototype.push = function (elem) {
  this.queue.push(elem[0], elem[1]);
};

IOS.prototype.isAppInstalled = function (bundleId, cb) {
  if (this.args.udid) {
    var isInstalledCommand = fruitstrap + ' isInstalled --id ' + this.args.udid + ' --bundle ' + bundleId;
    deviceCommon.isAppInstalled(isInstalledCommand, cb);
  } else {
    cb(new Error("You can not call isInstalled for the iOS simulator!"));
  }
};

IOS.prototype.removeApp = function (bundleId, cb) {
  if (this.args.udid) {
    var removeCommand = fruitstrap + ' uninstall --id ' + this.args.udid + ' --bundle ' + bundleId;
    deviceCommon.removeApp(removeCommand, this.args.udid, bundleId, cb);
  } else {
    cb(new Error("You can not call removeApp for the iOS simulator!"));
  }
};

IOS.prototype.installApp = function (unzippedAppPath, cb) {
  if (this.args.udid) {
    var installQuietFlag = this.args.quiet ? ' -q' : '';
    var installationCommand = fruitstrap + installQuietFlag + ' install --id ' + this.args.udid + ' --bundle "' + unzippedAppPath + '"';
    deviceCommon.installApp(installationCommand, this.args.udid, unzippedAppPath, cb);
  } else {
    cb(new Error("You can not call installApp for the iOS simulator!"));
  }
};

IOS.prototype.unpackApp = function (req, cb) {
  deviceCommon.unpackApp(req, '.app', cb);
};

IOS.prototype.startLogCapture = function (cb) {
  if (!_.isEmpty(this.logs)) {
    cb(new Error("Trying to start iOS log capture but it's already started!"));
    return;
  }
  this.logs.crashlog = new iOSCrashLog();
  this.logs.syslog = new iOSLog({
    udid: this.args.udid
  , xcodeVersion: this.xcodeVersion
  , debug: false
  , debugTrace: this.args.showSimulatorLog
  });
  this.logs.syslog.startCapture(function (err) {
    if (err) cb(err);
    this.logs.crashlog.startCapture(cb);
  }.bind(this));
};

_.extend(IOS.prototype, iOSHybrid);
_.extend(IOS.prototype, iOSController);

module.exports = IOS;
