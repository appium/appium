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
  , Instruments = require('./instruments.js')
  , helpers = require('../../helpers.js')
  , errors = require('../../server/errors.js')
  , deviceCommon = require('../common.js')
  , iOSLog = require('./ios-log.js')
  , iOSCrashLog = require('./ios-crash-log.js')
  , status = require("../../server/status.js")
  , IDevice = require('node-idevice')
  , async = require('async')
  , iOSController = require('./ios-controller.js')
  , iOSHybrid = require('./ios-hybrid.js')
  , UnknownError = errors.UnknownError;

// XML Plist library helper
var xmlPlistFile = function(filename, callback) {
  try {
    var result = xmlplist.parseFileSync(filename);
    return callback(null, result);
  } catch (ex) {
    return callback(ex);
  }
};

var IOS = function(args) {
  this.init(args);
};

IOS.prototype.init = function(args) {
  this.rest = args.rest;
  this.flakeyRetries = args.flakeyRetries;
  this.version = args.version;
  this.webSocket = args.webSocket;
  this.launchTimeout = args.launchTimeout;
  this.app = args.app;
  this.origAppPath = args.origAppPath;
  this.ipa = args.ipa;
  this.bundleId = args.bundleId || null;
  this.udid = args.udid;
  this.verbose = args.verbose;
  this.autoWebview = args.autoWebview;
  this.withoutDelay = args.withoutDelay;
  this.useDefaultDevice = args.defaultDevice;
  this.xcodeFolder = null;
  this.xcodeVersion = null;
  this.iOSSDKVersion = null;
  this.reset = args.reset;
  this.automationTraceTemplatePath = args.automationTraceTemplatePath;
  this.removeTraceDir = args.removeTraceDir;
  this.deviceName = args.deviceName;
  this.iosSimProcess = null;
  this.forceiPhone = args.forceiPhone;
  this.forceiPad = args.forceiPad;
  this.language = args.language;
  this.locale = args.locale;
  this.calendarFormat = args.calendarFormat;
  this.logs = {};
  this.showSimulatorLog = args.showSimulatorLog;
  this.startingOrientation = args.startingOrientation || "PORTRAIT";
  this.curOrientation = this.startingOrientation;
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.onInstrumentsDie = function() {};
  this.stopping = false;
  this.cbForCurrentCmd = null;
  this.remote = null;
  this.curWindowHandle = null;
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
  this.useRobot = args.robotPort > 0;
  this.robotUrl = this.useRobot ? "http://" + args.robotAddress + ":" + args.robotPort + "" : null;
  this.isSafariLauncherApp = args.isSafariLauncherApp;
  this.capabilities = {
      version: '0.0'
      , webStorageEnabled: false
      , locationContextEnabled: false
      , browserName: 'iOS'
      , platform: 'MAC'
      , javascriptEnabled: true
      , databaseEnabled: false
      , takesScreenshot: true
  };
  _.extend(this.capabilities, args.desiredCapabilities);
  this.supportedStrategies = ["name", "tag name", "xpath", "id"];
  this.localizableStrings = {};
};

IOS.prototype.preCleanup = function(cb) {
  var removeTracedirs = function(innerCb) {
    if (this.removeTraceDir) {
      logger.info("Cleaning up any tracedirs");
      glob("*.trace", {}, function(err, files) {
        if (err) {
          logger.error("Could not glob for tracedirs: " + err.message);
          innerCb(err);
        } else {
          if (files.length > 0) {
            var filesDone = 0;
            var onDelete = function() {
              filesDone++;
              if (filesDone === files.length) {
                innerCb();
              }
            };
            _.each(files, function(file) {
              file = path.resolve(process.cwd(), file);
              rimraf(file, function(err) {
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

  var removeSocket = function(innerCb) {
    logger.info("Removing any remaining instruments sockets");
    rimraf(sock, function(err) {
      if (err) return innerCb(err);
      logger.info("Cleaned up instruments socket " + sock);
      innerCb();
    });
  }.bind(this);

  async.series([removeSocket, removeTracedirs], cb);
};

IOS.prototype.getNumericVersion = function() {
  return parseFloat(this.version);
};

IOS.prototype.start = function(cb, onDie) {
  if (this.app && this.bundleId) {
    var err = new Error("You tried to launch instruments with both an app " +
                        "specification and a bundle ID. Choose one or the " +
                        "other");
    logger.error(err.message);
    return cb(err);
  }

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
    this.startLogCapture.bind(this),
    this.setDeviceAndLaunchSimulator.bind(this),
    this.installToRealDevice.bind(this),
    this.startInstruments.bind(this),
    this.onInstrumentsLaunch.bind(this),
    this.setBundleId.bind(this),
    this.setInitialOrientation.bind(this),
  ], function(err) {
    cb(err);
  });
};

IOS.prototype.startInstruments = function(cb) {
  logger.debug("Creating instruments");
  this.instruments = new Instruments({
    app: this.app || this.bundleId
    , udid: this.udid
    , isSafariLauncherApp: this.isSafariLauncherApp
    , bootstrap: path.resolve(__dirname, 'uiauto', 'bootstrap.js')
    , template: this.automationTraceTemplatePath
    , sock: sock
    , withoutDelay: this.withoutDelay
    , xcodeVersion: this.xcodeVersion
    , webSocket: this.webSocket
    , launchTimeout: this.launchTimeout
    , flakeyRetries: this.flakeyRetries
  });
  this.instruments.start(function(err) {
    if (err) {
      if (!_.isEmpty(this.logs)) {
        this.logs.syslog.stopCapture();
        this.logs = {};
      }
      this.postCleanup(function() {
        cb(err);
      });
    }
    cb();
  }.bind(this), function(code, tracedir) {
    this.onUnexpectedInstrumentsExit(code, tracedir);
  }.bind(this));
};

IOS.prototype.onInstrumentsLaunch = function(cb) {
  logger.info('Instruments launched. Starting poll loop for new commands.');
  this.instruments.setDebug(true);
  if (this.origAppPath) {
    logger.info("Copying app back to its original place");
    return ncp(this.app, this.origAppPath, cb);
  }

  cb();
};

IOS.prototype.setBundleId = function(cb) {
  if (this.isSafariLauncherApp) {
    if (!this.udid) {
      this.bundleId = "com.apple.mobilesafari";
    } else {
      this.bundleId = "";
    }
  }

  if (this.bundleId !== null) {
    cb();
  } else {
    this.proxy('au.bundleId()', function(err, bId) {
      if (err) return cb(err);
      logger.info('Bundle ID for open app is ' + bId.value);
      this.bundleId = bId.value;
      cb();
    }.bind(this));
  }
};

IOS.prototype.setInitialOrientation = function(cb) {
  if (this.isSafariLauncherApp) {
    return cb();
  }

  if (typeof this.startingOrientation === "string" &&
      _.contains(["LANDSCAPE", "PORTRAIT"],
                 this.startingOrientation.toUpperCase())
      ) {
    logger.info("Setting initial orientation to " + this.startingOrientation);
    var command = ["au.setScreenOrientation('",
      this.startingOrientation.toUpperCase(),"')"].join('');
    this.proxy(command, function(err, res) {
      if (err || res.status !== status.codes.Success.code) {
        logger.warn("Setting initial orientation did not work!");
      } else {
        this.curOrientation = this.startingOrientation;
      }
      cb();
    }.bind(this));
  } else {
    cb();
  }
};

IOS.prototype.onUnexpectedInstrumentsExit = function(code, traceDir) {
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

IOS.prototype.setXcodeFolder = function(cb) {
  helpers.getXcodeFolder(function(err, xcodeFolder) {
    if (err) {
      logger.error("Could not determine Xcode folder");
    }
    this.xcodeFolder = xcodeFolder;
    cb();
  }.bind(this));
};

IOS.prototype.setXcodeVersion = function(cb) {
  helpers.getXcodeVersion(function(err, versionNumber) {
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

IOS.prototype.setiOSSDKVersion = function(cb) {
  helpers.getiOSSDKVersion(function(err, versionNumber) {
    if (err) {
      logger.error("Could not determine iOS SDK version");
    }
    this.iOSSDKVersion = versionNumber;
    this.capabilities.version = versionNumber;
    cb();
  }.bind(this));
};

IOS.prototype.setLocale = function(cb) {
  var msg;
  if ((this.language || this.locale || this.calendarFormat) && this.udid === null) {
    var iosSimLocalePath = path.resolve(__dirname, "../../../build/ios-sim-locale");
    if (fs.existsSync(iosSimLocalePath)) {
      helpers.getiOSSimulatorDirectories(function(err, pathList) {
        if (err || typeof pathList  === 'undefined' || pathList.length < 1) {
         msg = "Cannot set locale information because the iOS Simulator directory could not be determined.";
         logger.error(msg);
         cb(new Error(msg));
        } else {
          var localeInfoWasSet = false;
          var setLanguageForPath = function(pathIndex) {
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
              cmd = (this.language) ? cmd + ' -language ' + this.language : cmd;
              cmd = (this.locale) ? cmd + ' -locale ' + this.locale : cmd;
              cmd = (this.calendarFormat) ? cmd + ' -calendar ' + this.calendarFormat : cmd;
              exec(cmd, { maxBuffer: 524288 }, function (err) {
                if (err === null) {
                  localeInfoWasSet = true;
                }
                setLanguageForPath(pathIndex+1);
              });
            }
          }.bind(this);
          setLanguageForPath(0);
        }
      }.bind(this));
    } else {
      msg = "Could not set locale information because the ios-sim-local was not found at " + iosSimLocalePath;
      logger.error(msg);
      cb(new Error(msg));
    }
  } else {
    logger.info("Not setting locale because we're using a real device");
    cb();
  }
};

IOS.prototype.detectTraceTemplate = function(cb) {
  var msg;
  if (!this.automationTraceTemplatePath) {
    helpers.getXcodeFolder(function(err, xcodeFolderPath) {
      if (err) return cb(err);
      if (xcodeFolderPath !== null) {
        var xcodeTraceTemplatePath = path.resolve(xcodeFolderPath,
          "../Applications/Instruments.app/Contents/PlugIns",
          "AutomationInstrument.bundle/Contents/Resources",
          "Automation.tracetemplate");
        if (fs.existsSync(xcodeTraceTemplatePath)) {
          this.automationTraceTemplatePath = xcodeTraceTemplatePath;
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
  if (this.udid !== null && this.udid === "auto") {
    logger.info("Auto-detecting iOS udid...");
    var udidetectPath = path.resolve(__dirname, "../../../build/udidetect/udidetect");
    var udiddetectProc = exec(udidetectPath, { maxBuffer: 524288, timeout: 3000 }, function(err, stdout) {
      if (stdout && stdout.length > 2) {
        this.udid = stdout.replace("\n","");
        logger.info("Detected udid as " + this.udid);
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
    cb();
  }
};

IOS.prototype.installToRealDevice = function (cb) {
  if (this.udid) {
    if (this.isSafariLauncherApp) {
      this.installSafariLauncher(cb);
    } else if (this.ipa && this.bundleId) {
      this.installIpa(cb);
    } else if (this.ipa) {
      var msg = "You specified a UDID and ipa but did not include the bundle " +
                "id";
      logger.error(msg);
      cb(new Error(msg));
    } else {
      logger.debug("Real device specified but no ipa, assuming bundle ID is " +
                   "on device");
      cb();
    }
  } else {
    logger.debug("No device id or app, not installing to real device.");
    cb();
  }
};

IOS.prototype.installSafariLauncher = function(cb) {
  this.isAppInstalled("com.bytearc.SafariLauncher", function(err) {
    if (err) {
      this.installApp(this.app, cb);
    } else {
      cb();
    }
  }.bind(this));
};

IOS.prototype.installIpa = function(cb) {
  logger.info("Installing ipa found at " + this.ipa);
  var idiPath = path.resolve(__dirname, "../../../build/",
                             "libimobiledevice-macosx/ideviceinstaller");
  try {
    this.realDevice = new IDevice(this.udid);
  } catch (e1) {
    logger.info("Couldn't find ideviceinstaller, trying built-in");
    try {
      this.realDevice = new IDevice(this.udid, {cmd: idiPath});
    } catch (e2) {
      return cb(e2);
    }
  }
  var d = this.realDevice;
  async.waterfall([
    function (cb) { d.isInstalled(this.bundleId, cb); }.bind(this),
    function (installed, cb) {
      if (installed) {
          logger.info("Bundle found on device, removing before reinstalling.");
          d.remove(this.bundleId, cb);
        } else {
          logger.debug("Nothing found on device, going ahead and installing.");
          cb();
        }
      }.bind(this),
    function (cb) { d.installAndWait(this.ipa, this.bundleId, cb); }.bind(this)
  ], cb);
};

IOS.prototype.getDeviceString = function() {
  var isiPhone = this.forceiPhone || this.forceiPad === null || (this.forceiPad !== null && !this.forceiPad);
  var isTall = isiPhone;
  var isRetina = this.xcodeVersion[0] !== '4';
  var is64bit = false;
  if (this.deviceName) {
    var device = this.deviceName.toLowerCase();
    if (device.indexOf("iphone") !== -1) {
      isiPhone = true;
    } else if (device.indexOf("ipad") !== -1) {
      isiPhone = false;
    }
    isTall = isiPhone && (device.indexOf("4-inch") !== -1);
    isRetina =  (device.indexOf("retina") !== -1);
    is64bit = (device.indexOf("64-bit") !== -1);
  }

  var iosDeviceString = isiPhone ? "iPhone" : "iPad";
  if (this.xcodeVersion[0] === '4') {
    if (isiPhone && isRetina) {
      iosDeviceString += isTall ? " (Retina 4-inch)" : " (Retina 3.5-inch)";
    } else {
      iosDeviceString += isRetina ? " (Retina)" : "" ;
    }
  } else {
    iosDeviceString += isRetina ? " Retina" : "";
    if (isiPhone) {
      if (isRetina && isTall) {
        iosDeviceString += is64bit ? " (4-inch 64-bit)" : " (4-inch)";
      } else {
        iosDeviceString += " (3.5-inch)";
      }
    } else {
      iosDeviceString += is64bit ? " (64-bit)" : "";
    }
  }
  return iosDeviceString;
};

IOS.prototype.setDeviceTypeInInfoPlist = function(deviceTypeCode, cb) {
  var plist = path.resolve(this.app, "Info.plist");
  bplistParse.parseFile(plist, function(err, obj) {
    var newPlist;
    if (err) {
      xmlPlistFile(plist, function(err, obj) {
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
    fs.writeFile(plist, newPlist, function(err) {
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

IOS.prototype.setDeviceAndLaunchSimulator = function(cb) {
  var msg;
  if (this.udid) {
    logger.info("Not setting device type since we're connected to a device");
    cb();
  } else if (this.bundleId) {
    logger.info("Not setting device type since we're using bundle ID and " +
                "assuming app is already installed");
    cb(null);
  } else if (!this.deviceName && this.forceiPhone === null && this.forceiPad === null) {
    logger.info("No device specified, current device in the iOS simulator will be used.");
    cb(null);
  } else if (this.useDefaultDevice) {
    logger.info("User specified default device, letting instruments launch it");
    var iosDeviceString = this.getDeviceString();
    var isiPhone = iosDeviceString.toLowerCase().indexOf("ipad") === -1;
    this.setDeviceTypeInInfoPlist(isiPhone ? 1 : 2, cb);
  } else {
    var iosSimPath = path.resolve(this.xcodeFolder, "Platforms/iPhoneSimulator.platform/Developer/Applications"+
      "/iPhone Simulator.app/Contents/MacOS/iPhone Simulator");
    if (!fs.existsSync(iosSimPath)) {
      msg = "Could not find ios simulator binary at " + iosSimPath;
      logger.error(msg);
      cb(new Error(msg));
    } else {

      this.endSimulator(function(err) {
        if (err) return cb(err);
        var iosDeviceString = this.getDeviceString();
        var isiPhone = iosDeviceString.toLowerCase().indexOf("ipad") === -1;
        var iosSimArgs = ["-SimulateDevice", iosDeviceString];
        logger.debug("Launching device: " + iosDeviceString);
        this.setDeviceTypeInInfoPlist(isiPhone ? 1 : 2, function() {
          this.iosSimProcess = spawn(iosSimPath, iosSimArgs);
          var waitForSimulatorLogs = function(countdown) {
            if (countdown <= 0 || this.logs.syslog.getAllLogs().length > 0 || this.logs.crashlog.getAllLogs().length > 0) {
              logger.info(countdown > 0 ? "Simulator is now ready." : "Waited 10 seconds for simulator to start.");
              cb();
            } else {
              setTimeout(function() {
                waitForSimulatorLogs(countdown-1);
              } ,1000);
            }
          }.bind(this);
          waitForSimulatorLogs(10);
        }.bind(this));
      }.bind(this));
    }
  }
};

IOS.prototype.parseLocalizableStrings = function(cb) {
  if (this.app === null) {
    logger.info("Localizable.strings is not currently supported when using real devices.");
    cb();
  } else {
    var strings = path.resolve(this.app, "Localizable.strings");

    if (!fs.existsSync(strings)) {
      strings = path.resolve(this.app, "en.lproj", "Localizable.strings");
    }

    bplistParse.parseFile(strings, function(err, obj) {
      if (err) {
        xmlPlistFile(strings, function(err, obj) {
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


IOS.prototype.getSimulatorApplications = function(cb) {
  var user = process.env.USER;
  var simDir = "/Users/" + user + "/Library/Application\\ " +
               "Support/iPhone\\ Simulator";
  var findCmd = 'find ' + simDir + ' -name "Applications"';
  exec(findCmd, function(err, stdout) {
    if (err) return cb(err);
    var files = [];
    _.each(stdout.split("\n"), function(line) {
      if (line.trim()) {
        files.push(line.trim());
      }
    });
    cb(null, files);
  });
};

IOS.prototype.cleanupAppState = function(cb) {
  logger.info("Deleting simulator folders.");
  this.getSimulatorApplications(function(err, files) {
    if (err) {
      logger.error("Could not remove: " + err.message);
      cb(err);
    } else {
      var filesExamined = 0;
      var maybeNext = function() {
        if (filesExamined === files.length) {
          cb();
        }
      };
      if (files.length) {
        _.each(files, function(file) {
          rimraf(file, function() {
            logger.info("Deleted " + file);
            filesExamined++;
            maybeNext();
          });

          var root = path.dirname(file);
          var tcc = path.join(root, 'Library/TCC');
          if (fs.existsSync(tcc)) {
            rimraf.sync(tcc);
            logger.info("Deleted " + tcc);
          }

          var caches = path.join(root, 'Library/Caches');
          if (fs.existsSync(caches)) {
            rimraf.sync(caches);
            logger.info("Deleted " + caches);
          }

          var media = path.join(root, 'Media');
          if (fs.existsSync(media)) {
            rimraf.sync(media);
            logger.info("Deleted " + media);
          }
        });
      } else {
        logger.info("No folders found to remove");
        if (this.realDevice) {
          this.realDevice.remove(this.bundleId, function (err) {
            if (err) {
              logger.error("Could not remove " + this.bundleId + " from device");
              cb(err);
            } else {
              logger.info("Removed " + this.bundleId);
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

IOS.prototype.postCleanup = function(cb) {
  this.curCoords = null;
  this.curOrientation = null;

  if (!_.isEmpty(this.logs)) {
    this.logs.syslog.stopCapture();
    this.logs = {};
  }

  if (this.remote) {
    this.stopRemote();
  }

  if (this.reset) {
    // The simulator process must be ended before we delete applications.
    async.series([
      function(cb) { this.endSimulator(cb); }.bind(this),
      function(cb) { this.cleanupAppState(cb); }.bind(this),
    ], cb);
  } else {
    logger.info("Reset set to false, not ending sim or cleaning up app state");
    cb();
  }

};

IOS.prototype.endSimulator = function(cb) {
  logger.info("Killing the simulator process and daemons");
  if (this.iosSimProcess) {
    this.iosSimProcess.kill("SIGHUP");
    this.iosSimProcess = null;
    this.endSimulatorDaemons(cb);
  } else {
    var cmd = 'killall -9 "iPhone Simulator"';
    exec(cmd, { maxBuffer: 524288 }, function(err) {
      if (err && err.message.indexOf('matching processes') === -1) {
        cb(err);
      } else {
        this.endSimulatorDaemons(cb);
      }
    }.bind(this));
  }

};

IOS.prototype.endSimulatorDaemons = function(cb) {
  var stopCmd = 'launchctl list | grep com.apple.iphonesimulator.launchd | cut -f 3 | xargs -n 1 launchctl stop';
  exec(stopCmd, { maxBuffer: 524288 } , function() {
    var removeCmd = 'launchctl list | grep com.apple.iphonesimulator.launchd | cut -f 3 | xargs -n 1 launchctl remove';
    exec(removeCmd, { maxBuffer: 524288 }, function() {
      cb();
    });
  });
};

IOS.prototype.stop = function(cb) {
  logger.info("Stopping ios");
  if (this.instruments === null) {
    logger.info("Trying to stop instruments but it already exited");
    this.postCleanup(cb);
  } else {
    this.instruments.shutdown(function(code, traceDir) {
      this.shutdown(code, traceDir, cb);
    }.bind(this));
  }
};

IOS.prototype.shutdown = function(code, traceDir, cb) {
  this.queue = [];
  this.progress = 0;
  this.instruments = null;

  var removeTraceDir = function(cb) {
    if (this.removeTraceDir && traceDir) {
      rimraf(traceDir, function(err) {
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
  ], function() {
    cb();
  });

};

IOS.prototype.waitForCondition = deviceCommon.waitForCondition;

IOS.prototype.proxy = deviceCommon.proxy;
IOS.prototype.proxyWithMinTime = deviceCommon.proxyWithMinTime;
IOS.prototype.respond = deviceCommon.respond;

IOS.prototype.push = function(elem) {
  this.queue.push(elem);

  var next = function() {
    if (this.queue.length <= 0 || this.progress > 0) {
      return;
    }

    var target = this.queue.shift()
    , command = target[0]
    , cb = target[1];

    if (this.selectingNewPage && this.curWindowHandle) {
      logger.info("We're in the middle of selecting a new page, " +
                  "waiting to run next command until done");
      setTimeout(next, 500);
      this.queue.unshift(target);
      return;
    } else if (this.curWindowHandle && this.processingRemoteCmd) {
      var matches = ["au.alertIsPresent", "au.getAlertText", "au.acceptAlert",
                     "au.dismissAlert", "au.setAlertText",
                     "au.waitForAlertToClose"];
      var matched = false;
      _.each(matches, function(match) {
        if (command.indexOf(match) === 0) {
          matched = true;
        }
      });
      if (!matched) {
        logger.info("We're in the middle of processing a remote debugger " +
                    "command, waiting to run next command until done");
        setTimeout(next, 500);
        this.queue.unshift(target);
        return;
      }
    }

    this.cbForCurrentCmd = cb;

    this.progress++;
    if (this.instruments) {
      logger.debug("Sending command to instruments: " + command);
      this.instruments.sendCommand(command, function(response) {
        this.cbForCurrentCmd = null;
        if (typeof cb === 'function') {
          this.respond(response, cb);
        }

        // maybe there's moar work to do
        this.progress--;
        next();
      }.bind(this));
    }
  }.bind(this);

  next();
};

IOS.prototype.isAppInstalled = function(bundleId, cb) {
  if (this.udid) {
      var isInstalledCommand = 'build/fruitstrap/fruitstrap isInstalled --id ' + this.udid + ' --bundle ' + bundleId;
      deviceCommon.isAppInstalled(isInstalledCommand, cb);
  } else {
    cb(new Error("You can not call isInstalled for the iOS simulator!"));
  }
};

IOS.prototype.removeApp = function(bundleId, cb) {
  if (this.udid) {
    var removeCommand = 'build/fruitstrap/fruitstrap uninstall --id ' + this.udid + ' --bundle ' + bundleId;
    deviceCommon.removeApp(removeCommand, this.udid, bundleId, cb);
  } else {
    cb(new Error("You can not call removeApp for the iOS simulator!"));
  }
};

IOS.prototype.installApp = function(unzippedAppPath, cb) {
  if (this.udid) {
    var installationCommand = 'build/fruitstrap/fruitstrap install --id ' + this.udid + ' --bundle ' + unzippedAppPath;
    deviceCommon.installApp(installationCommand, this.udid, unzippedAppPath, cb);
  } else {
    cb(new Error("You can not call installApp for the iOS simulator!"));
  }
};

IOS.prototype.unpackApp = function(req, cb) {
  deviceCommon.unpackApp(req, '.app', cb);
};

IOS.prototype.startLogCapture = function(cb) {
  if (!_.isEmpty(this.logs)) {
    cb(new Error("Trying to start iOS log capture but it's already started!"));
    return;
  }
  this.logs.crashlog = new iOSCrashLog();
  this.logs.syslog = new iOSLog({
    udid: this.udid
    , xcodeVersion: this.xcodeVersion
    , debug: false
    , debugTrace: this.showSimulatorLog
  });
  this.logs.syslog.startCapture(function(err) {
    if (err) cb(err);
    this.logs.crashlog.startCapture(cb);
  }.bind(this));
};

_.extend(IOS.prototype, iOSHybrid);
_.extend(IOS.prototype, iOSController);

module.exports = IOS;
