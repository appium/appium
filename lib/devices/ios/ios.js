"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , ncp = require('ncp').ncp
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
  , xmlplist = require('plist')
  , Device = require('../device.js')
  , Instruments = require('./instruments.js')
  , xcode = require('./xcode.js')
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
  , Simulator = require('./simulator.js')
  , fruitstrap = path.resolve(__dirname, '../../../build/fruitstrap/fruitstrap')
  , prepareBootstrap = require('./uiauto').prepareBootstrap
  , CommandProxy = require('./uiauto').CommandProxy
  , UnknownError = errors.UnknownError
  , binaryPlist = true;

// XML Plist library helper
var parseXmlPlistFile = function (plist, cb) {
  try {
    var result = xmlplist.parseFileSync(plist);
    return cb(null, result);
  } catch (ex) {
    return cb(ex);
  }
};

var parsePlistFile = function (plist, cb) {
  bplistParse.parseFile(plist, function (err, obj) {
    if (err) {
      logger.debug("Could not parse plist file (as binary) at " + plist);
      logger.info("Will try to parse the plist file as XML");
      parseXmlPlistFile(plist, function (err, obj) {
        if (err) {
          logger.debug("Could not parse plist file (as XML) at " + plist);
          return cb(err, null);
        } else {
          logger.debug("Parsed app Info.plist (as XML)");
          binaryPlist = false;
          cb(null, obj);
        }
      });
    } else {
      binaryPlist = true;
      if (obj.length) {
        logger.debug("Parsed app Info.plist (as binary)");
        cb(null, obj[0]);
      } else {
        cb(new Error("Binary Info.plist appears to be empty"));
      }
    }
  });
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
  , networkConnectionEnabled: false
  };
  this.xcodeFolder = null;
  this.xcodeVersion = null;
  this.iOSSDKVersion = null;
  this.iosSimProcess = null;
  this.iOSSimUdid = null;
  this.logs = {};
  this.instruments = null;
  this.commandProxy = null;
  this.initQueue();
  this.onInstrumentsDie = function () {};
  this.stopping = false;
  this.cbForCurrentCmd = null;
  this.remote = null;
  this.curContext = null;
  this.curWebFrames = [];
  this.selectingNewPage = false;
  this.processingRemoteCmd = false;
  this.remoteAppKey = null;
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
  this.supportedStrategies = ["name", "xpath", "id", "-ios uiautomation",
                              "class name", "accessibility id"];
  this.landscapeWebCoordsOffset = 0;
  this.localizableStrings = {};
  this.keepAppToRetainPrefs = false;
  this.isShuttingDown = false;
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

  // on iOS8 we can use a bundleId to launch an app on the simulator, but
  // on previous versions we can only do so on a real device, so we need
  // to do a check of which situation we're in
  var ios8 = caps.platformVersion &&
             parseFloat(caps.platformVersion) >= 8;

  if (!this.args.app &&
      !((ios8 || this.args.udid) && this.args.bundleId)) {
    msg = "Please provide the 'app' capability or start appium with the " +
          "--app argument. Alternatively, you may provide the " +
          "'bundleId' and 'udid' capabilities for an app under test on " +
          "a real device.";
    logger.error(msg);

    return cb(new Error(msg));
  }

  return this.configureApp(cb);
};

IOS.prototype.setIOSArgs = function () {
  this.args.withoutDelay = !this.args.nativeInstrumentsLib;
  this.args.reset = !this.args.noReset;
  this.args.deviceName = this.args.deviceName || this.args.platformName;
  this.args.initialOrientation = this.capabilities.deviceOrientation ||
                                 this.args.orientation ||
                                 "PORTRAIT";
  this.useRobot = this.args.robotPort > 0;
  this.args.robotUrl = this.useRobot ?
    "http://" + this.args.robotAddress + ":" + this.args.robotPort + "" :
    null;
  this.curOrientation = this.args.initialOrientation;
  this.sock = path.resolve(this.args.tmpDir || '/tmp', 'instruments_sock');

  this.perfLogEnabled = !!(typeof this.args.loggingPrefs === 'object' && this.args.loggingPrefs.performance);
};

IOS.prototype.configureApp = function (cb) {
  var _cb = cb;
  cb = function (err) {
    if (err) {
      err = new Error("Bad app: " + this.args.app + ". App paths need to " +
                      "be absolute, or relative to the appium server " +
                      "install dir, or a URL to compressed file, or a " +
                      "special app name. cause: " + err);
    }
    _cb(err);
  }.bind(this);

  var app = this.appString();

  // if the app name is a bundleId assign it to the bundleId property
  if (!this.args.bundleId && this.appIsPackageOrBundle(app)) {
    this.args.bundleId = app;
  }

  if (app !== "" && app.toLowerCase() === "settings") {
    if (parseFloat(this.args.platformVersion) >= 8) {
      logger.debug("We're on iOS8+ so not copying preferences app");
      this.args.bundleId = "com.apple.Preferences";
      this.args.app = null;
    }
    cb();
  } else if (this.args.bundleId &&
             this.appIsPackageOrBundle(this.args.bundleId)) {
    // we have a bundle ID
    logger.debug("App is an iOS bundle, will attempt to run as pre-existing");
    cb();
  } else {
    Device.prototype.configureApp.call(this, cb);
  }
};

IOS.prototype.preCleanup = function (cb) {
  var removeSocket = function (innerCb) {
    logger.debug("Removing any remaining instruments sockets");
    rimraf(this.sock, function (err) {
      if (err) return innerCb(err);
      logger.debug("Cleaned up instruments socket " + this.sock);
      innerCb();
    }.bind(this));
  }.bind(this);
  removeSocket(cb);
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
    this.checkDeviceAvailable.bind(this),
    this.createSimulator.bind(this),
    this.moveBuiltInApp.bind(this),
    this.detectTraceTemplate.bind(this),
    this.detectUdid.bind(this),
    this.parseLocalizableStrings.bind(this),
    this.setBundleIdFromApp.bind(this),
    this.createInstruments.bind(this),
    this.setDeviceInfo.bind(this),
    this.checkPreferences.bind(this),
    this.runSimReset.bind(this),
    this.isolateSimDevice.bind(this),
    this.setLocale.bind(this),
    this.setPreferences.bind(this),
    this.startLogCapture.bind(this),
    this.prelaunchSimulator.bind(this),
    this.installToRealDevice.bind(this),
    this.startInstruments.bind(this),
    this.onInstrumentsLaunch.bind(this),
    this.configureBootstrap.bind(this),
    this.setBundleId.bind(this),
    this.setInitialOrientation.bind(this),
    this.initAutoWebview.bind(this),
    this.waitForAppLaunched.bind(this),
  ], function (err) {
    cb(err);
  });
};

IOS.prototype.createInstruments = function (cb) {
  logger.debug("Creating instruments");
  this.commandProxy = new CommandProxy({ sock: this.sock });
  this.makeInstruments(function (err, instruments) {
    if (err) return cb(err);
    this.instruments = instruments;
    cb();
  }.bind(this));
};

IOS.prototype.startInstruments = function (cb) {
  cb = _.once(cb);

  var treatError = function (err, cb) {
    if (!_.isEmpty(this.logs)) {
      this.logs.syslog.stopCapture();
      this.logs = {};
    }
    this.postCleanup(function () {
      cb(err);
    });
  }.bind(this);

  if (this.shouldIgnoreInstrumentsExit()) {
    // for safari on a real device, instruments is going to crash, but we
    // expect that and ignore it
    logger.debug("Not starting command proxy since we're expecting that " +
                 "Instruments won't be able to talk to it anyway");
    this.instruments.start(
      function (err) {
        if (err) return treatError(err, cb);
        // instruments will never check into the command proxy, so go ahead
        // and just call back here once instruments is started, rather than
        // waiting for it to make the first connection to the command proxy
        cb();
      }
    , function () {
        // ignore unexpected instruments exit since that's exactly what
        // we're expecting anyway
    });
  } else {
    logger.debug("Starting command proxy.");
    this.commandProxy.start(
      function (err) { // on first connection
        // first let instruments know so that it does not restart itself
        this.instruments.launchHandler(err);
        // then we call the callback
        cb(err);
      }.bind(this)
      //
    , function (err) { // regular cb
        if (err) return treatError(err, cb);
        logger.debug("Starting instruments");
        this.instruments.start(
          function (err) {
            if (err) return treatError(err, cb);
            // we don't call cb here, waiting for first connection or error
          }.bind(this)
        , function (code) {
            this.onUnexpectedInstrumentsExit(code);
          }.bind(this)
        );
      }.bind(this)
    );
  }
};

IOS.prototype.makeInstruments = function (cb) {
  if (this.xcodeVerNumeric >= 6 && this.args.withoutDelay) {
    logger.info("On some xcode 6 platforms, instruments-without-delay does " +
                "not work. If you experience this, you will need to re-run " +
                "appium with the --native-instruments-lib flag");

  }

  // at the moment all the logging in uiauto is at debug level
  // TODO: be able to use info in appium-uiauto
  prepareBootstrap({
    sock: this.sock,
    interKeyDelay: this.args.interKeyDelay,
    justLoopInfinitely: this.shouldIgnoreInstrumentsExit(),
    autoAcceptAlerts: !(!this.args.autoAcceptAlerts || this.args.autoAcceptAlerts === 'false')
  }).then(
    function (bootstrapPath) {
      var instruments = new Instruments({
        app: this.args.app || this.args.bundleId
      , udid: this.args.udid
      , processArguments: this.args.processArguments
      , ignoreStartupExit: this.shouldIgnoreInstrumentsExit()
      , bootstrap: bootstrapPath
      , template: this.args.automationTraceTemplatePath
      , withoutDelay: this.args.withoutDelay
      , platformVersion: this.args.platformVersion
      , xcodeVersion: this.xcodeVersion
      , webSocket: this.args.webSocket
      , launchTimeout: this.args.launchTimeout
      , flakeyRetries: this.args.backendRetries
      , simulatorSdkAndDevice: this.iOSSDKVersion >= 7.1 ? this.getDeviceString() : null
      , tmpDir: path.resolve(this.args.tmpDir , 'appium-instruments')
      , traceDir: this.args.traceDir
      });
      cb(null, instruments);
    }.bind(this), function (err) { cb(err); }
  );
};

IOS.prototype.shouldIgnoreInstrumentsExit = function () {
  return false;
};

IOS.prototype.onInstrumentsLaunch = function (cb) {
  logger.debug('Instruments launched. Starting poll loop for new commands.');
  this.instruments.setDebug(true);
  if (this.args.origAppPath) {
    logger.debug("Copying app back to its original place");
    return ncp(this.args.app, this.args.origAppPath, cb);
  }

  cb();
};

IOS.prototype.setBundleId = function (cb) {
  if (this.args.bundleId) {
    // We already have a bundle Id
    cb();
  } else {
    this.proxy('au.bundleId()', function (err, bId) {
      if (err) return cb(err);
      logger.debug('Bundle ID for open app is ' + bId.value);
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
    logger.debug("Setting initial orientation to " + this.args.initialOrientation);
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

IOS.prototype.waitForAppLaunched = function (cb) {
  // on iOS8 in particular, we can get a working session before the app
  // is ready to respond to commands; in that case the source will be empty
  // so we just spin until it's not
  logger.debug("Waiting for app source to contain elements");
  var condFn = function (cb) {
    this.getSourceForElementForXML(null, function (err, res) {
      if (err || !res || res.status !== status.codes.Success.code) {
        return cb(false, err);
      }
      var sourceObj, appEls;
      try {
        sourceObj = JSON.parse(res.value);
        appEls = sourceObj.UIAApplication['>'];
        if (appEls.length > 0) {
          return cb(true);
        } else {
          return cb(false, new Error("App did not have elements"));
        }
      } catch (e) {
        return cb(false, new Error("Couldn't parse JSON source"));
      }
      return cb(true, err);
    });
  }.bind(this);
  this.waitForCondition(10000, condFn, cb, 500);
};

IOS.prototype.configureBootstrap = function (cb) {
  logger.debug("Setting bootstrap config keys/values");
  var isVerbose = logger.transports.console.level === 'debug';
  var cmd = '';
  cmd += 'target = $.target();\n';
  cmd += 'au = $;\n';
  cmd += '$.isVerbose = ' + isVerbose + ';\n';
  // Not using uiauto grace period because of bug.
  // cmd += '$.target().setTimeout(1);\n';
  this.proxy(cmd, cb);
};

IOS.prototype.onUnexpectedInstrumentsExit = function (code) {
  logger.debug("Instruments exited unexpectedly");
  this.isShuttingDown = true;
  var postShutdown = function () {
    if (typeof this.cbForCurrentCmd === "function") {
      logger.debug("We were in the middle of processing a command when " +
                   "instruments died; responding with a generic error");
      var error = new UnknownError("Instruments died while responding to " +
                                   "command, please check appium logs");
      this.onInstrumentsDie(error, this.cbForCurrentCmd);
    } else {
      this.onInstrumentsDie();
    }
  }.bind(this);
  if (this.commandProxy) {
    this.commandProxy.safeShutdown(function () {
      this.shutdown(code, postShutdown);
    }.bind(this));
  } else {
    this.shutdown(code, postShutdown);
  }
};

IOS.prototype.setXcodeFolder = function (cb) {
  logger.debug("Setting Xcode folder");
  xcode.getPath(function (err, xcodeFolder) {
    if (err) {
      logger.error("Could not determine Xcode folder:" + err.message);
    }
    this.xcodeFolder = xcodeFolder;
    cb();
  }.bind(this));
};

IOS.prototype.setXcodeVersion = function (cb) {
  logger.debug("Setting Xcode version");
  xcode.getVersion(function (err, versionNumber) {
    if (err) {
      logger.error("Could not determine Xcode version:" + err.message);
    }
    this.xcodeVersion = versionNumber;
    this.xcodeVerNumeric = parseFloat(versionNumber);
    if (this.xcodeVersion === "5.0.1") {
      cb(new Error("Xcode 5.0.1 ships with a broken version of " +
                   "Instruments. please upgrade to 5.0.2"));
    } else {
      cb();
    }
  }.bind(this));
};

IOS.prototype.setiOSSDKVersion = function (cb) {
  logger.debug("Setting iOS SDK Version");
  xcode.getiOSSDKVersionWithRetry(3, function (err, versionNumber) {
    if (err) {
      logger.error("Could not determine iOS SDK version");
      return cb(err);
    }
    this.iOSSDKVersion = versionNumber;
    logger.debug("iOS SDK Version set to " + this.iOSSDKVersion);
    cb();
  }.bind(this));
};

IOS.prototype.setLocale = function (cb) {
  var msg;
  var setLoc = function (err) {
    logger.debug("Setting locale information");
    if (err) return cb(err);
    var needSimRestart = false;
    this.localeConfig = this.localeConfig || {};
    _(['language', 'locale', 'calendarFormat']).each(function (key) {
      needSimRestart = needSimRestart ||
                      (this.args[key] &&
                       this.args[key] !== this.localeConfig[key]);
    }, this);
    this.localeConfig = {
      language: this.args.language,
      locale: this.args.locale,
      calendarFormat: this.args.calendarFormat
    };
    var simRoots = this.sim.getDirs();
    if (simRoots.length < 1) {
      msg = "Cannot set locale information because the iOS Simulator directory could not be determined.";
      logger.error(msg);
      return cb(new Error(msg));
    }

    try {
      this.sim.setLocale(this.args.language, this.args.locale, this.args.calendarFormat);
    } catch (e) {
      msg = "Appium was unable to set locale info: " + e;
      logger.error(msg);
      return cb(new Error(msg));
    }

    logger.debug("Locale was set");
    if (needSimRestart) {
      logger.debug("First time setting locale, or locale changed, killing existing Instruments and Sim procs.");
      Instruments.killAllSim(this.xcodeVersion);
      Instruments.killAll();
      setTimeout(cb, 250);
    } else {
      cb();
    }
  }.bind(this);

  if ((this.args.language || this.args.locale || this.args.calendarFormat) && this.args.udid === null) {

    if (this.args.fullReset && this.args.platformVersion <= 6.1) {
      msg = "Cannot set locale information because a full-reset was requested. full-reset interferes with the language/locale caps on iOS 6.1 and older";
      logger.error(msg);
      return cb(new Error(msg));
    }

    if (!this.sim.dirsExist()) {
      this.instantLaunchAndQuit(false, setLoc);
    } else {
      setLoc();
    }
  } else if (this.args.udid) {
    logger.debug("Not setting locale because we're using a real device");
    cb();
  } else {
    logger.debug("Not setting locale");
    cb();
  }
};

IOS.prototype.checkPreferences = function (cb) {
  logger.debug("Checking whether we need to set app preferences");
  if (this.args.udid !== null) {
    logger.debug("Not setting iOS and app preferences since we're on a real " +
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
  this.needToSetPrefs = false;
  this.needToSetSafariPrefs = false;
  _.each(settingsCaps, function (cap) {
    if (_.has(this.capabilities, cap)) {
      this.needToSetPrefs = true;
      if (_.contains(safariSettingsCaps, cap)) {
        this.needToSetSafariPrefs = true;
      }
    }
  }.bind(this));

  this.keepAppToRetainPrefs = this.needToSetPrefs;

  cb();

};

IOS.prototype.setPreferences = function (cb) {
  if (!this.needToSetPrefs) {
    logger.debug("No iOS / app preferences to set");
    return cb();
  } else if (this.args.fullReset) {
    var msg = "Cannot set preferences because a full-reset was requested";
    logger.debug(msg);
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

  logger.debug("Setting iOS and app preferences");
  if (!this.sim.dirsExist() ||
      !settings.locServicesDirsExist(this.sim) ||
      (this.needToSetSafariPrefs && !this.sim.safariDirsExist())) {
    this.instantLaunchAndQuit(this.needToSetSafariPrefs, setPrefs);
  } else {
    setPrefs();
  }
};

IOS.prototype.instantLaunchAndQuit = function (needSafariDirs, cb) {
  logger.debug("Sim files for the " + this.iOSSDKVersion + " SDK do not yet exist, launching the sim " +
      "to populate the applications and preference dirs");

  var condition = function () {
    var simDirsExist = this.sim.dirsExist();
    var locServicesExist = settings.locServicesDirsExist(this.sim);
    var safariDirsExist = this.iOSSDKVersion < 7.0 ||
                          this.sim.safariDirsExist();
    var okToGo = simDirsExist && locServicesExist &&
                 (!needSafariDirs || safariDirsExist);
    if (!okToGo) {
      logger.debug("We launched the simulator but the required dirs don't " +
                   "yet exist. Waiting some more...");
    }
    return okToGo;
  }.bind(this);

  this.prelaunchSimulator(function (err) {
    if (err) return cb(err);
    this.makeInstruments(function (err, instruments) {
      instruments.launchAndKill(condition, function (err) {
        if (err) return cb(err);
        this.endSimulator(cb);
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

IOS.prototype.setLocServicesPrefs = function () {
  if (typeof this.capabilities.locationServicesEnabled !== "undefined" ||
      this.capabilities.locationServicesAuthorized) {
    var locServ = this.capabilities.locationServicesEnabled;
    locServ = locServ || this.capabilities.locationServicesAuthorized;
    locServ = locServ ? 1 : 0;
    logger.debug("Setting location services to " + locServ);
    settings.updateSettings(this.sim, 'locationServices', {
        LocationServicesEnabled: locServ,
        'LocationServicesEnabledIn7.0': locServ
      }
    );
  }
  if (typeof this.capabilities.locationServicesAuthorized !== "undefined") {
    if (!this.args.bundleId) {
      var msg = "Can't set location services for app without bundle ID";
      logger.error(msg);
      throw new Error(msg);
    }
    var locAuth = !!this.capabilities.locationServicesAuthorized;
    if (locAuth) {
      logger.debug("Authorizing location services for app");
    } else {
      logger.debug("De-authorizing location services for app");
    }
    settings.updateLocationSettings(this.sim, this.args.bundleId, locAuth);
  }
};


IOS.prototype.setSafariPrefs = function () {
  var safariSettings = {};
  var val;
  if (_.has(this.capabilities, 'safariAllowPopups')) {
    val = !!this.capabilities.safariAllowPopups;
    logger.debug("Setting javascript window opening to " + val);
    safariSettings.WebKitJavaScriptCanOpenWindowsAutomatically = val;
  }
  if (_.has(this.capabilities, 'safariIgnoreFraudWarning')) {
    val = !this.capabilities.safariIgnoreFraudWarning;
    logger.debug("Setting fraudulent website warning to " + val);
    safariSettings.WarnAboutFraudulentWebsites = val;
  }
  if (_.has(this.capabilities, 'safariOpenLinksInBackground')) {
    val = this.capabilities.safariOpenLinksInBackground ? 1 : 0;
    logger.debug("Setting opening links in background to " + !!val);
    safariSettings.OpenLinksInBackground = val;
  }
  if (_.size(safariSettings) > 0) {
    settings.updateSafariSettings(this.sim, safariSettings);
  }
};

IOS.prototype.detectTraceTemplate = function (cb) {
  logger.debug("Detecting automation tracetemplate");
  var msg;
  if (!this.args.automationTraceTemplatePath) {
    xcode.getPath(function (err, xcodeFolderPath) {
      if (err) return cb(err);
      if (xcodeFolderPath !== null) {
        var instExt = this.iOSSDKVersion >= 8 ? 'xrplugin' : 'bundle';
        var xcodeTraceTemplatePath = path.resolve(xcodeFolderPath,
          "../Applications/Instruments.app/Contents/PlugIns",
          "AutomationInstrument." + instExt + "/Contents/Resources",
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
    logger.debug("Auto-detecting iOS udid...");
    var udidetectPath = path.resolve(__dirname, "../../../build/udidetect/udidetect");
    var udiddetectProc = exec(udidetectPath, { maxBuffer: 524288, timeout: 3000 }, function (err, stdout) {
      if (stdout && stdout.length > 2) {
        this.args.udid = stdout.replace("\n", "");
        logger.debug("Detected udid as " + this.args.udid);
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
    logger.debug("Not auto-detecting udid, running on sim");
    cb();
  }
};

IOS.prototype.setBundleIdFromApp = function (cb) {
  // This method will try to extract the bundleId from the app
  if (this.args.bundleId) {
    // We aleady have a bundle Id
    cb();
  } else {
    this.getBundleIdFromApp(function (err, bundleId) {
      if (err) {
        logger.error("Could not set the bundleId from app.");
        return cb(err);
      }
      this.args.bundleId = bundleId;
      cb();
    }.bind(this));
  }
};

IOS.prototype.installToRealDevice = function (cb) {
  // if user has passed in desiredCaps.autoLaunch = false
  // meaning they will manage app install / launching
  if (this.args.autoLaunch === false) {
    cb();
  } else {
    if (this.args.udid) {
      try {
        this.realDevice = this.getIDeviceObj();
      } catch (e) {
        return cb(e);
      }
      this.isAppInstalled(this.args.bundleId, function (err) {
        if (err) {
          logger.debug("App is not installed. Will try to install the app.");
        } else {
          logger.debug("App is installed.");
          if (this.args.fullReset) {
            logger.debug("fullReset requested. Forcing app install.");
          } else {
            logger.debug("fullReset not requested. No need to install.");
            return cb();
          }
        }
        if (this.args.ipa && this.args.bundleId) {
          this.installIpa(cb);
        } else if (this.args.ipa) {
          var msg = "You specified a UDID and ipa but did not include the bundle " +
            "id";
          logger.error(msg);
          cb(new Error(msg));
        } else if (this.args.app) {
          this.installApp(this.args.app, cb);
        } else {
          logger.debug("Real device specified but no ipa or app path, assuming bundle ID is " +
                       "on device");
          cb();
        }
      }.bind(this));
    } else {
      logger.debug("No device id or app, not installing to real device.");
      cb();
    }
  }
};

IOS.prototype.getIDeviceObj = function () {
  var idiPath = path.resolve(__dirname, "../../../build/",
                             "libimobiledevice-macosx/ideviceinstaller");
  logger.debug("Creating iDevice object with udid " + this.args.udid);
  try {
    return iDevice(this.args.udid);
  } catch (e1) {
    logger.debug("Couldn't find ideviceinstaller, trying built-in at " +
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
  logger.debug("Installing ipa found at " + this.args.ipa);
  this.realDevice = this.getIDeviceObj();
  var d = this.realDevice;
  async.waterfall([
    function (cb) { d.isInstalled(this.args.bundleId, cb); }.bind(this),
    function (installed, cb) {
      if (installed) {
        logger.debug("Bundle found on device, removing before reinstalling.");
        d.remove(this.args.bundleId, cb);
      } else {
        logger.debug("Nothing found on device, going ahead and installing.");
        cb();
      }
    }.bind(this),
    function (cb) { d.installAndWait(this.args.ipa, this.args.bundleId, cb); }.bind(this)
  ], cb);
};

IOS.getDeviceStringFromOpts = function (opts) {
  logger.debug("Getting device string from opts: " + JSON.stringify({
    forceIphone: opts.forceIphone,
    forceIpad: opts.forceIpad,
    xcodeVersion: opts.xcodeVersion,
    iOSSDKVersion: opts.iOSSDKVersion,
    deviceName: opts.deviceName,
    platformVersion: opts.platformVersion
  }));
  var isiPhone = opts.forceIphone || opts.forceIpad === null || (opts.forceIpad !== null && !opts.forceIpad);
  var isTall = isiPhone;
  var isRetina = opts.xcodeVersion[0] !== '4';
  var is64bit = false;
  var deviceName = opts.deviceName;
  var fixDevice = true;
  if (deviceName && deviceName[0] === '=') {
    deviceName = deviceName.substring(1);
    fixDevice = false;
  }
  logger.debug("fixDevice is " + (fixDevice ? "on" : "off"));
  if (deviceName) {
    var device = deviceName.toLowerCase();
    if (device.indexOf("iphone") !== -1) {
      isiPhone = true;
    } else if (device.indexOf("ipad") !== -1) {
      isiPhone = false;
    }
    if (deviceName !== opts.platformName) {
      isTall = isiPhone && (device.indexOf("4-inch") !== -1);
      isRetina =  (device.indexOf("retina") !== -1);
      is64bit = (device.indexOf("64-bit") !== -1);
    }
  }

  var iosDeviceString = isiPhone ? "iPhone" : "iPad";
  if (opts.xcodeVersion[0] === '4') {
    if (isiPhone && isRetina) {
      iosDeviceString += isTall ? " (Retina 4-inch)" : " (Retina 3.5-inch)";
    } else {
      iosDeviceString += isRetina ? " (Retina)" : "";
    }
  } else if (opts.xcodeVersion[0] === '5') {
    iosDeviceString += isRetina ? " Retina" : "";
    if (isiPhone) {
      if (isRetina && isTall) {
        iosDeviceString += is64bit ? " (4-inch 64-bit)" : " (4-inch)";
      } else if (deviceName.toLowerCase().indexOf("3.5") !== -1) {
        iosDeviceString += " (3.5-inch)";
      }
    } else {
      iosDeviceString += is64bit ? " (64-bit)" : "";
    }
  } else if (opts.xcodeVersion[0] === '6') {
    iosDeviceString = opts.deviceName ||
      (isiPhone ? "iPhone Simulator" : "iPad Simulator");
  }
  var reqVersion = opts.platformVersion || opts.iOSSDKVersion;
  if (opts.iOSSDKVersion >= 8) {
    iosDeviceString += " (" + reqVersion + " Simulator)";
  } else if (opts.iOSSDKVersion >= 7.1) {
    iosDeviceString += " - Simulator - iOS " + reqVersion;
  }
  if (fixDevice) {
    // Some device config are broken in 5.1
    var CONFIG_FIX = {
      'iPhone - Simulator - iOS 7.1': 'iPhone Retina (4-inch 64-bit) - ' +
                                      'Simulator - iOS 7.1',
      'iPad - Simulator - iOS 7.1': 'iPad Retina (64-bit) - Simulator - ' +
                                    'iOS 7.1',
      'iPad Simulator (8.0 Simulator)': 'iPad 2 (8.0 Simulator)',
      'iPad Simulator (8.1 Simulator)': 'iPad 2 (8.1 Simulator)',
      'iPad Simulator (7.1 Simulator)': 'iPad 2 (7.1 Simulator)',
      'iPhone Simulator (8.1 Simulator)': 'iPhone 6 (8.1 Simulator)',
      'iPhone Simulator (8.0 Simulator)': 'iPhone 6 (8.0 Simulator)',
      'iPhone Simulator (7.1 Simulator)': 'iPhone 5s (7.1 Simulator)'
    };
    if (CONFIG_FIX[iosDeviceString]) {
      var oldDeviceString = iosDeviceString;
      iosDeviceString = CONFIG_FIX[iosDeviceString];
      logger.debug("Fixing device. Changed from: \"" + oldDeviceString +
                   "\" to: \"" + iosDeviceString + "\"");
    }
  }
  logger.debug("Final device string is: '" + iosDeviceString + "'");
  return iosDeviceString;
};

IOS.prototype.getDeviceString = function () {
  var opts = _.clone(this.args);
  _.extend(opts, {
    xcodeVersion: this.xcodeVersion,
    iOSSDKVersion: this.iOSSDKVersion
  });
  return IOS.getDeviceStringFromOpts(opts);
};

IOS.prototype.setDeviceTypeInInfoPlist = function (cb) {
  var plist = path.resolve(this.args.app, "Info.plist");
  var dString = this.getDeviceString();
  var isiPhone = dString.toLowerCase().indexOf("ipad") === -1;
  var deviceTypeCode = isiPhone ? 1 : 2;
  parsePlistFile(plist, function (err, obj) {
    if (err) {
      logger.error("Could not set the device type in Info.plist");
      return cb(err, null);
    } else {
      var newPlist;
      obj.UIDeviceFamily = [deviceTypeCode];
      if (binaryPlist) {
        newPlist = bplistCreate(obj);
      } else {
        newPlist = xmlplist.build(obj);
      }
      fs.writeFile(plist, newPlist, function (err) {
        if (err) {
          logger.error("Could not save new Info.plist");
          cb(err);
        } else {
          logger.debug("Wrote new app Info.plist with device type");
          cb();
        }
      }.bind(this));
    }
  }.bind(this));
};

IOS.prototype.getBundleIdFromApp = function (cb) {
  logger.debug("Getting bundle ID from app");
  var plist = path.resolve(this.args.app, "Info.plist");
  parsePlistFile(plist, function (err, obj) {
    if (err) {
      logger.error("Could not get the bundleId from app.");
      cb(err, null);
    } else {
      cb(null, obj.CFBundleIdentifier);
    }
  }.bind(this));
};

IOS.getSimForDeviceString = function (dString, availDevices) {
  var matchedDevice = null;
  var matchedUdid = null;
  _.each(availDevices, function (device) {
    if (device.indexOf(dString) !== -1) {
      matchedDevice = device;
      try {
        matchedUdid = /.+\[([^\]]+)\]/.exec(device)[1];
      } catch (e) {
        matchedUdid = null;
      }
    }
  });
  return [matchedDevice, matchedUdid];
};

IOS.prototype.checkDeviceAvailable = function (cb) {
  if (this.args.udid) {
    logger.debug("Not checking whether simulator is available since we're on " +
                 "a real device");
    return cb();
  }

  if (this.iOSSDKVersion < 7.1) {
    logger.debug("Instruments v < 7.1, not checking device string support");
    return cb();
  }

  logger.debug("Checking whether instruments supports our device string");
  Instruments.getAvailableDevicesWithRetry(3, function (err, availDevices) {
    if (err) return cb(err);
    var noDevicesError = function () {
      var msg = "Could not find a device to launch. You requested '" +
                dString + "', but the available devices were: " +
                JSON.stringify(availDevices);
      logger.error(msg);
      cb(new Error(msg));
    };
    var dString = this.getDeviceString();
    if (this.iOSSDKVersion >= 8) {
      var sim = IOS.getSimForDeviceString(dString, availDevices);
      if (sim[0] === null || sim[1] === null) {
        return noDevicesError();
      }
      this.iOSSimUdid = sim[1];
      logger.debug("iOS sim UDID is " + this.iOSSimUdid);
      return cb();
    } else if (!_.contains(availDevices, dString)) {
      return noDevicesError();
    }
    cb();
  }.bind(this));
};

IOS.prototype.setDeviceInfo = function (cb) {
  this.shouldPrelaunchSimulator = false;
  if (this.args.udid) {
    logger.debug("Not setting device type since we're on a real device");
    return cb();
  }

  if (!this.args.app && this.args.bundleId) {
    logger.debug("Not setting device type since we're using bundle ID and " +
                "assuming app is already installed");
    return cb();
  }

  if (!this.args.deviceName &&
      this.args.forceIphone === null &&
      this.args.forceIpad === null) {
    logger.debug("No device specified, current device in the iOS " +
                 "simulator will be used.");
    return cb();
  }

  if (this.args.defaultDevice || this.iOSSDKVersion >= 7.1) {
    if (this.iOSSDKVersion >= 7.1) {
      logger.debug("We're on iOS7.1+ so forcing defaultDevice on");
    } else {
      logger.debug("User specified default device, letting instruments launch it");
    }
  } else {
    this.shouldPrelaunchSimulator = true;
  }
  this.setDeviceTypeInInfoPlist(cb);
};

IOS.prototype.createSimulator = function (cb) {
  this.sim = new Simulator({
    platformVer: this.args.platformVersion,
    sdkVer: this.iOSSDKVersion,
    udid: this.iOSSimUdid
  });
  cb();
};

IOS.prototype.moveBuiltInApp = function (cb) {
  if (this.appString().toLowerCase() === "settings") {
    logger.debug("Trying to use settings app, version " +
                 this.args.platformVersion);
    this.sim.preparePreferencesApp(this.args.tmpDir, function (err, attemptedApp, origApp) {
      if (err) {
        logger.error("Could not prepare settings app: " + err);
        return cb(err);
      }
      logger.debug("Using settings app at " + attemptedApp);
      this.args.app = attemptedApp;
      this.args.origAppPath = origApp;
      cb();
    }.bind(this));
  } else {
    cb();
  }
};

IOS.prototype.prelaunchSimulator = function (cb) {
  var msg;
  if (!this.shouldPrelaunchSimulator) {
    logger.debug("Not pre-launching simulator");
    return cb();
  }

  logger.debug("Pre-launching simulator");
  var iosSimPath = path.resolve(this.xcodeFolder,
      "Platforms/iPhoneSimulator.platform/Developer/Applications" +
      "/iPhone Simulator.app/Contents/MacOS/iPhone Simulator");
  if (!fs.existsSync(iosSimPath)) {
    msg = "Could not find ios simulator binary at " + iosSimPath;
    logger.error(msg);
    return cb(new Error(msg));
  }
  this.endSimulator(function (err) {
    if (err) return cb(err);
    logger.debug("Launching device: " + this.getDeviceString());
    var iosSimArgs = ["-SimulateDevice", this.getDeviceString()];
    this.iosSimProcess = spawn(iosSimPath, iosSimArgs);
    var waitForSimulatorLogs = function (countdown) {
      if (countdown <= 0 ||
        (this.logs.syslog && (this.logs.syslog.getAllLogs().length > 0 ||
        (this.logs.crashlog && this.logs.crashlog.getAllLogs().length > 0)))) {
        logger.debug(countdown > 0 ? "Simulator is now ready." :
                     "Waited 10 seconds for simulator to start.");
        cb();
      } else {
        setTimeout(function () {
          waitForSimulatorLogs(countdown - 1);
        }, 1000);
      }
    }.bind(this);
    waitForSimulatorLogs(10);
  }.bind(this));
};

IOS.prototype.parseLocalizableStrings = function (cb, language) {
  if (this.args.app === null) {
    logger.debug("Localizable.strings is not currently supported when using real devices.");
    cb();
  } else {
    var strings = null;
    language = language || this.args.language;
    if (language) {
      strings = path.resolve(this.args.app, language + ".lproj", "Localizable.strings");
    }
    if (!fs.existsSync(strings)) {
      if (language) {
        logger.debug("No Localizable.strings for language '" + language + "', getting default strings");
      }
      strings = path.resolve(this.args.app, "Localizable.strings");
    }
    if (!fs.existsSync(strings)) {
      strings = path.resolve(this.args.app, this.args.localizableStringsDir, "Localizable.strings");
    }

    parsePlistFile(strings, function (err, obj) {
      if (err) {
        logger.warn("Could not parse app Localizable.strings; assuming it " +
                    "doesn't exist");
      } else {
        logger.debug("Parsed app Localizable.strings");
        this.localizableStrings = obj;
      }
      cb();
    }.bind(this));
  }
};


IOS.prototype.deleteSim = function (cb) {
  this.sim.deleteSim(cb);
};

IOS.prototype.clearAppData = function (cb) {
  if (!this.keepAppToRetainPrefs && this.args.app && this.args.bundleId) {
    this.sim.cleanCustomApp(path.basename(this.args.app), this.args.bundleId);
  }
  cb();
};

IOS.prototype.cleanupSimState = function (cb) {
  if (this.realDevice && this.args.bundleId && this.args.fullReset) {
    logger.debug("fullReset requested. Will try to uninstall the app.");
    var bundleId = this.args.bundleId;
    this.realDevice.remove(bundleId, function (err) {
      if (err) {
        this.removeApp(bundleId, function (err) {
          if (err) {
            logger.error("Could not remove " + bundleId + " from device");
            cb(err);
          } else {
            logger.debug("Removed " + bundleId);
            cb();
          }
        }.bind(this));
      } else {
        logger.debug("Removed " + bundleId);
        cb();
      }
    }.bind(this));
  } else if (!this.args.udid) {
    this.sim.cleanSim(this.args.keepKeyChains);
    this.clearAppData(cb);
  } else {
    logger.debug("On a real device; cannot clean device state");
    cb();
  }
};

IOS.prototype.runSimReset = function (cb) {
  if (this.args.reset || this.args.fullReset) {
    logger.debug("Running ios sim reset flow");
    // The simulator process must be ended before we delete applications.
    async.series([
      this.endSimulator.bind(this),
      function (cb) {
        if (this.args.reset) {
          this.cleanupSimState(cb);
        } else {
          cb();
        }
      }.bind(this),
      function (cb) {
        if (this.args.fullReset && !this.args.udid) {
          this.deleteSim(cb);
        } else {
          cb();
        }
      }.bind(this)
    ], cb);
  } else {
    logger.debug("Reset not set, not ending sim or cleaning up app state");
    cb();
  }
};

IOS.prototype.isolateSimDevice = function (cb) {
  if (!this.args.udid && this.args.isolateSimDevice &&
      this.iOSSDKVersion >= 8) {
    this.sim.deleteOtherSims(cb);
  } else {
    cb();
  }
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

  this.runSimReset(function () {
    // ignore any errors during reset and continue shutting down
    this.isShuttingDown = false;
    cb();
  }.bind(this));


};

IOS.prototype.endSimulator = function (cb) {
  logger.debug("Killing the simulator process");
  if (this.iosSimProcess) {
    this.iosSimProcess.kill("SIGHUP");
    this.iosSimProcess = null;
  } else {
    Instruments.killAllSim(this.xcodeVersion);
  }
  this.endSimulatorDaemons(cb);
};

IOS.prototype.endSimulatorDaemons = function (cb) {
  logger.debug("Killing any other simulator daemons");
  var stopCmd = 'launchctl list | grep com.apple.iphonesimulator | cut -f 3 | xargs -n 1 launchctl stop';
  exec(stopCmd, { maxBuffer: 524288 }, function () {
    var removeCmd = 'launchctl list | grep com.apple.iphonesimulator | cut -f 3 | xargs -n 1 launchctl remove';
    exec(removeCmd, { maxBuffer: 524288 }, function () {
      cb();
    });
  });
};

IOS.prototype.stop = function (cb) {
  logger.debug("Stopping ios");
  if (this.instruments === null) {
    logger.debug("Trying to stop instruments but it already exited");
    this.postCleanup(cb);
  } else {
    this.commandProxy.shutdown(function (err) {
      if (err) logger.warn("Got warning when trying to close command proxy:", err);
      this.instruments.shutdown(function (code) {
        this.shutdown(code, cb);
      }.bind(this));
    }.bind(this));
  }
};

IOS.prototype.shutdown = function (code, cb) {
  this.commandProxy = null;
  this.instruments = null;
  this.postCleanup(cb);
};

IOS.prototype.resetTimeout = deviceCommon.resetTimeout;
IOS.prototype.waitForCondition = deviceCommon.waitForCondition;
IOS.prototype.implicitWaitForCondition = deviceCommon.implicitWaitForCondition;
IOS.prototype.proxy = deviceCommon.proxy;
IOS.prototype.proxyWithMinTime = deviceCommon.proxyWithMinTime;
IOS.prototype.respond = deviceCommon.respond;
IOS.prototype.getSettings = deviceCommon.getSettings;
IOS.prototype.updateSettings = deviceCommon.updateSettings;

IOS.prototype.initQueue = function () {

  this.queue = async.queue(function (command, cb) {
    if (!this.commandProxy) return cb();
    async.series([
      function (cb) {
        async.whilst(
          function () { return this.selectingNewPage && this.curContext; }.bind(this),
          function (cb) {
            logger.debug("We're in the middle of selecting a new page, " +
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
          function () { return !matched && this.curContext && this.processingRemoteCmd; }.bind(this),
          function (cb) {
            logger.debug("We're in the middle of processing a remote debugger " +
                        "command, waiting to run next command until done");
            setTimeout(cb, 100);
          },
          cb
        );
      }.bind(this)
    ], function (err) {
      if (err) return cb(err);
      this.cbForCurrentCmd = cb;
      if (this.commandProxy) {
        this.commandProxy.sendCommand(command, function (response) {
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
  , simUdid: this.iOSSimUdid
  , xcodeVersion: this.xcodeVersion
  , showLogs: this.args.showSimulatorLog || this.args.showIOSLog
  });
  this.logs.syslog.startCapture(function (err) {
    if (err) cb(err);
    this.logs.crashlog.startCapture(cb);
  }.bind(this));
};

IOS.prototype.initAutoWebview = function (cb) {
  if (this.args.autoWebview) {
    logger.debug('Setting auto webview');
    this.navToInitialWebview(cb);
  } else {
    cb();
  }
};

IOS.prototype.navToInitialWebview = function (cb) {
  if (this.args.udid) {
    setTimeout(function () {
      // the latest window is the one we want.
      this.navToLatestAvailableWebview(cb);
    }.bind(this), 6000);
  } else {
    this.navToLatestAvailableWebview(cb);
  }
};

IOS.prototype.navToLatestAvailableWebview = function (cb) {
  if (parseInt(this.iOSSDKVersion, 10) >= 7 && !this.args.udid && this.capabilities.safari) {
    this.navToViewThroughFavorites(cb);
  } else {
    this.navToView(cb);
  }
};

IOS.prototype.navToViewThroughFavorites = function (cb) {
  logger.debug("We're on iOS7 simulator: clicking apple button to get into " +
              "a webview");
  var oldImpWait = this.implicitWaitMs;
  this.implicitWaitMs = 7000; // wait 7s for apple button to exist
  this.findElement('xpath', '//UIAScrollView[1]/UIAButton[1]', function (err, res) {
    this.implicitWaitMs = oldImpWait;
    if (err || res.status !== status.codes.Success.code) {
      var msg = "Could not find button to click to get into webview. " +
                "Proceeding on the assumption we have a working one.";
      logger.error(msg);
      return this.navToView(cb);
    }
    this.nativeTap(res.value.ELEMENT, function (err, res) {
      if (err || res.status !== status.codes.Success.code) {
        var msg = "Could click button to get into webview. " +
                  "Proceeding on the assumption we have a working one.";
        logger.error(msg);
      }
      this.navToView(cb);
    }.bind(this));
  }.bind(this));
};

IOS.prototype.navToView = function (cb) {
  logger.debug("Navigating to most recently opened webview");
  var start = Date.now();
  var spinTime = 500;
  var spinHandles = function () {
    this.getContexts(function (err, res) {
      if (err || res.status && res.status !== 0) {
        cb(new Error("Could not navigate to webview! Err: " + err));
      } else if (res.value.length < 2) {
        // NATIVE_WIN is always in the list of contexts, so we need at least
        // 2 contexts to know we have an active webview
        if ((Date.now() - start) < 20000) {
          logger.warn("Could not find any webviews yet, refreshing/retrying");
          if (!this.capabilities.safari) {
            return setTimeout(spinHandles, spinTime);
          }
          this.findUIElementOrElements('accessibility id', 'ReloadButton',
              '', false, function (err, res) {
            if (err || !res || !res.value || !res.value.ELEMENT) {
              logger.warn("Could not find reload button, continuing");
              setTimeout(spinHandles, spinTime);
            } else {
              this.nativeTap(res.value.ELEMENT, function (err, res) {
                if (err || !res) {
                  logger.warn("Could not click reload button, continuing");
                }
                setTimeout(spinHandles, spinTime);
              }.bind(this));
            }
          }.bind(this));
        } else {
          cb(new Error("Could not navigate to webview; there aren't any!"));
        }
      } else {
        var latestWindow = res.value[res.value.length - 1];
        logger.debug("Picking webview " + latestWindow);
        this.setContext(latestWindow, function (err) {
          if (err) return cb(err);
          this.remote.cancelPageLoad();
          cb();
        }.bind(this), true);
      }
    }.bind(this));
  }.bind(this);
  spinHandles();
};

_.extend(IOS.prototype, iOSHybrid);
_.extend(IOS.prototype, iOSController);

module.exports = IOS;
