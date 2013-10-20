"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , sock = '/tmp/instruments_sock'
  , glob = require('glob')
  , exec = require('child_process').exec
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
  , xmlplist = require('plist')
  , instruments = require('./instruments.js')
  , helpers = require('../../helpers.js')
  , errors = require('../../server/errors.js')
  , deviceCommon = require('../common.js')
  , iOSLog = require('./ios-log.js')
  , status = require("../../server/status.js")
  , IDevice = require('node-idevice')
  , async = require('async')
  , iOSController = require('./ios-controller.js')
  , iOSHybrid = require('./ios-hybrid.js')
  , UnknownError = errors.UnknownError;

var IOS = function(args) {
  this.rest = args.rest;
  this.version = args.version;
  this.webSocket = args.webSocket;
  this.app = args.app;
  this.ipa = args.ipa;
  this.bundleId = args.bundleId || null;
  this.udid = args.udid;
  this.verbose = args.verbose;
  this.autoWebview = args.autoWebview;
  this.withoutDelay = args.withoutDelay;
  this.xcodeVersion = null;
  this.reset = args.reset;
  this.automationTraceTemplatePath = args.automationTraceTemplatePath;
  this.removeTraceDir = args.removeTraceDir;
  this.deviceType = args.deviceType;
  this.logs = null;
  this.startingOrientation = args.startingOrientation || "PORTRAIT";
  this.curOrientation = this.startingOrientation;
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.onStop = function() {};
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
  var safariLauncherAppName = "/safarilauncher.app";
  this.isSafariLauncherApp = (typeof args.app !== "undefined") && (args.app.toLowerCase().indexOf(safariLauncherAppName, args.app.length - safariLauncherAppName.length) !== -1);
  this.capabilities = {
      version: '6.0'
      , webStorageEnabled: false
      , locationContextEnabled: false
      , browserName: 'iOS'
      , platform: 'MAC'
      , javascriptEnabled: true
      , databaseEnabled: false
      , takesScreenshot: true
  };
  this.supportedStrategies = ["name", "tag name", "xpath", "id"];
  this.localizableStrings = {};
};

// XML Plist library helper
var xmlPlistFile = function(filename, callback) {
  try {
    var result = xmlplist.parseFileSync(filename);
    return callback(null, result);
  } catch (ex) {
    return callback(ex);
  }
};

IOS.prototype.cleanup = function(cb) {
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
              rimraf(file, function() {
                logger.info("Cleaned up " + file);
                onDelete();
              });
            });
          } else {
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

  this.instrumentsDidLaunch = false;
  if (typeof onDie === "function") {
    this.onStop = onDie;
  }

  var onLaunch = function() {
    this.onInstrumentsLaunch(cb);
  }.bind(this);

  var onExit = function(code, traceDir) {
    this.onInstrumentsExit(code, traceDir, cb);
  }.bind(this);

  var createInstruments = function() {
    logger.debug("Creating instruments");
    this.instruments = instruments(
      this.app || this.bundleId
      , this.udid
      , this.isSafariLauncherApp
      , path.resolve(__dirname, 'uiauto', 'bootstrap.js')
      , this.automationTraceTemplatePath
      , sock
      , this.withoutDelay
      , this.xcodeVersion
      , this.webSocket
      , onLaunch
      , onExit
    );
  }.bind(this);

  // run through all the startup stuff
  // createInstruments takes care of calling our launch callback,
  // so we don't do that in the series here
  async.series([
    function (cb) { this.cleanup(cb); }.bind(this),
    function (cb) { this.setXcodeVersion(cb); }.bind(this),
    function (cb) { this.detectTraceTemplate(cb); }.bind(this),
    function (cb) { this.detectUdid(cb); }.bind(this),
    function (cb) { this.parseLocalizableStrings(cb); }.bind(this),
    function (cb) { this.setDeviceType(cb); }.bind(this),
    function (cb) { this.startLogCapture(cb); }.bind(this),
    function (cb) { this.installToRealDevice(cb); }.bind(this),
    function (cb) { createInstruments(); cb(); }.bind(this)
  ], function() {});
};

IOS.prototype.onInstrumentsLaunch = function(launchCb) {
  this.instrumentsDidLaunch = true;
  logger.info('Instruments launched. Starting poll loop for new commands.');
  this.instruments.setDebug(true);

  async.series([
    this.setBundleId.bind(this),
    this.setInitialOrientation.bind(this),
    this.navToInitialWebview.bind(this)
  ], function(err) {
    if (err) return launchCb(err);
    launchCb();
  });

};

IOS.prototype.setBundleId = function(cb) {
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
  if (typeof this.startingOrientation === "string" && _.contains(["LANDSCAPE", "PORTRAIT"], this.startingOrientation.toUpperCase())) {
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

IOS.prototype.onInstrumentsExit = function(code, traceDir, launchCb) {
  if (!this.instrumentsDidLaunch) {
    logger.error("Instruments did not launch successfully, failing session");
    return launchCb(new Error("Instruments did not launch successfully--" +
                              "please check your app paths or bundle IDs " +
                              "and try again"));
  }

  if (typeof this.cbForCurrentCmd === "function") {
    // we were in the middle of waiting for a command when it died
    // so let's actually respond with something
    var error = new UnknownError("Instruments died while responding to " +
                                 "command, please check appium logs");
    this.cbForCurrentCmd(error, null);
    code = 1; // this counts as an error even if instruments doesn't think so
  }
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
    if (!this.stopping) {
      this.onStop(code);
    }
  }.bind(this);

  var cleanup = function(cb) {
    if (this.stopping) {
      this.postCleanup(function() {
        this.bundleId = null;
        this.onStop(code);
        this.onStop = null;
        cb();
      }.bind(this));
    } else {
      cb();
    }
  }.bind(this);

  async.series([removeTraceDir, cleanup], function() {});

  if (this.iosLogs !== null) {
    this.logs.stopCapture();
  }
  
};

IOS.prototype.setXcodeVersion = function(cb) {
  helpers.getXcodeVersion(function(err, versionNumber) {
    if (err) {
      logger.error("Could not determine Xcode version");
    }
    this.xcodeVersion = versionNumber;
    cb();
  }.bind(this));
};

IOS.prototype.detectTraceTemplate = function(cb) {
  if (this.automationTraceTemplatePath === null) {
    helpers.getXcodeFolder(function(res, xcodeFolderPath) {
      if (xcodeFolderPath !== null) {
        var xcodeTraceTemplatePath = path.resolve(xcodeFolderPath,
          "../Applications/Instruments.app/Contents/PlugIns/AutomationInstrument.bundle/Contents/Resources/" +
          "Automation.tracetemplate");
        if (fs.existsSync(xcodeTraceTemplatePath)) {
          this.automationTraceTemplatePath = xcodeTraceTemplatePath;
          cb();
        } else {
          logger.error("Could not find Automation.tracetemplate in " + xcodeTraceTemplatePath);
          cb(new Error("Could not find Automation.tracetemplate in " + xcodeTraceTemplatePath));
        }
      } else {
        logger.error("Could not find Automation.tracetemplate because XCode could not be found. " +
          "Try setting the path with xcode-select.");
        cb(new Error("Could not find Automation.tracetemplate because XCode could not be found."));
      }
    }.bind(this));
  } else {
    cb();
  }
};

IOS.prototype.detectUdid = function (cb) {
  if (this.udid !== null && this.udid === "auto") {
    logger.info("Auto-detecting iOS udid...");
    var udidetectPath = path.resolve(__dirname, "../build/udidetect/udidetect");
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
  if (this.udid && this.ipa && this.bundleId) {
    logger.info("Installing ipa found at " + this.ipa);
    this.realDevice = new IDevice(this.udid);

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
  } else {
    logger.debug("No device id or app, not installing to real device.");
    cb();
  }
};

IOS.prototype.setDeviceType = function(cb) {
  if (this.udid) {
    logger.info("Not setting device type since we're connected to a device");
    cb();
  } else if (this.bundleId) {
    logger.info("Not setting device type since we're using bundle ID and " +
                "assuming app is already installed");
    cb(null);
  } else {
    var deviceTypeCode = 1
      , plist = path.resolve(this.app, "Info.plist");

    if (typeof this.deviceType === "undefined") {
      this.deviceType = "iphone";
    }

    logger.info("Forcing use of " + this.deviceType);
    if (this.deviceType === "ipad") {
      deviceTypeCode = 2;
    }

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
          cb(null);
        }
      });
    });
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
  logger.info("Deleting plists for bundle: " + this.bundleId);
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
        });
      } else {
        logger.info("No plist files found to remove");
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
    cb();
  }

};

IOS.prototype.endSimulator = function(cb) {
  var cmd = 'killall -9 "iPhone Simulator"';
  exec(cmd, { maxBuffer: 524288 }, function(err) {
    cb(err);
  });
};

IOS.prototype.stop = function(cb) {
  if (this.instruments === null) {
    logger.info("Trying to stop instruments but it already exited");
    this.postCleanup(cb);
  } else {
    if (cb) {
      this.onStop = cb;
    }

    this.stopping = true;
    this.instruments.shutdown();
    this.queue = [];
    this.progress = 0;
  }
};

IOS.prototype.waitForCondition = deviceCommon.waitForCondition;

IOS.prototype.setCommandTimeout = function(secs, cb) {
  var cmd = "waitForDataTimeout = " + parseInt(secs, 10);
  this.proxy(cmd, cb);
};

IOS.prototype.resetCommandTimeout = function(cb) {
  var cmd = "waitForDataTimeout = defWaitForDataTimeout";
  this.proxy(cmd, cb);
};

IOS.prototype.getCommandTimeout = function(cb) {
  var cmd = "waitForDataTimeout";
  this.proxy(cmd, cb);
};

IOS.prototype.proxy = deviceCommon.proxy;
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

IOS.prototype.startLogCapture = function(cb) {
  if (this.logs !== null) {
    cb(new Error("Trying to start iOS log capture but it's already started!"));
    return;
  }
  this.logs = new iOSLog({
    udid: this.udid
    , xcodeVersion: this.xcodeVersion
    , debug: false
    , debugTrace: false
  });
  this.logs.startCapture(cb);
};

IOS.prototype.unpackApp = function(req, cb) {
  deviceCommon.unpackApp(req, '.app', cb);
};

_.each(_.keys(iOSHybrid), function(method) {
  IOS.prototype[method] = iOSHybrid[method];
});

_.each(_.keys(iOSController), function(method) {
  IOS.prototype[method] = iOSController[method];
});

module.exports = function(args) {
  return new IOS(args);
};
