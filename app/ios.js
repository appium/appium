"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , glob = require('glob')
  , exec = require('child_process').exec
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
  , xmlplist = require('plist')
  , instruments = require('../instruments/instruments')
  , uuid = require('uuid-js')
  , helpers = require('./helpers.js')
  , escapeSpecialChars = helpers.escapeSpecialChars
  , parseWebCookies = helpers.parseWebCookies
  , rotateImage = helpers.rotateImage
  , rd = require('./hybrid/ios/remote-debugger')
  , wkrd = require('./hybrid/ios/webkit-remote-debugger')
  , errors = require('./errors')
  , deviceCommon = require('./device')
  , status = require("./uiauto/lib/status")
  , IDevice = require('node-idevice')
  , async = require('async')
  , request = require('request')
  , mkdirp = require('mkdirp')
  , NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError
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
  this.reset = args.reset;
  this.removeTraceDir = args.removeTraceDir;
  this.useLocationServices = args.useLocationServices;
  this.deviceType = args.deviceType;
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


  var traceTemplate = 'Automation' +
                      (this.getNumericVersion() >= 7 ? "-7.0" : "") +
                      '.tracetemplate';
  var createInstruments = function() {
    logger.debug("Creating instruments");
    this.instruments = instruments(
      this.app || this.bundleId
      , this.udid
      , path.resolve(__dirname, 'uiauto/bootstrap.js')
      , path.resolve(__dirname, 'uiauto/' + traceTemplate)
      , sock
      , this.withoutDelay
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
    function (cb) { this.detectUdid(cb); }.bind(this),
    function (cb) { this.parseLocalizableStrings(cb); }.bind(this),
    function (cb) { this.setDeviceType(cb); }.bind(this),
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
    this.setLocationServicesPref.bind(this),
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

IOS.prototype.setLocationServicesPref = function(cb) {
  var cmd = "setBootstrapConfig: useLocationServices=" +
            JSON.stringify(this.useLocationServices);
  this.proxy(cmd, cb);
};

IOS.prototype.navToInitialWebview = function(cb) {
  if (this.autoWebview) {
    this.navToFirstAvailWebview(cb);
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

};

IOS.prototype.detectUdid = function (cb) {
  if (this.udid !== null && this.udid == "auto") {
    logger.info("Auto-detecting iOS udid...");
    var udidetectPath = path.resolve(__dirname, "../build/udidetect/udidetect");
    var udiddetectProc = exec(udidetectPath, { maxBuffer: 524288, timeout: 3000 }, function(err, stdout) {
      if (stdout && stdout.length > 2) {
        this.udid = stdout.replace("\n","");
        logger.info("Detected udid as " + this.udid);
      } else {
        logger.error("Could not detect udid.");
      }
      cb();
    }.bind(this));
    udiddetectProc.on('timeout', function () {
      logger.error("Timed out trying to detect udid.");
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


IOS.prototype.navToFirstAvailWebview = function(cb) {
  logger.info("Navigating to first available webview");
  this.getWindowHandles(function(err, res) {
    if (res.status !== 0) {
      cb("Could not navigate to webview! Code: " + res.status);
    } else if (res.value.length === 0) {
      cb("Could not navigate to webview; there aren't any!");
    } else {
      logger.info("Picking webview " + res.value[0]);
      this.setWindow(res.value[0], function(err) {
        if (err) {
          cb(err);
        } else {
          cb(null);
        }
      });
    }
  }.bind(this));
};

IOS.prototype.closeAlertBeforeTest = function(cb) {
  this.proxy("au.alertIsPresent()", function(err, res) {
    if (!err && res !== null && typeof res.value !== "undefined" && res.value === true) {
      logger.info("Alert present before starting test, let's banish it");
      this.proxy("au.dismissAlert()", function() {
        logger.info("Alert banished!");
        cb(true);
      });
    } else {
      cb(false);
    }
  }.bind(this));
};

IOS.prototype.getAppPlistFiles = function(cb) {
  var user = process.env.USER;
  var simDir = "/Users/" + user + "/Library/Application\\ " +
               "Support/iPhone\\ Simulator";
  var findCmd = 'find ' + simDir + ' -name "' + this.bundleId + '*.plist"';
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
  this.getAppPlistFiles(function(err, files) {
    if (err) {
      logger.error("Could not remove plist: " + err.message);
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

IOS.prototype.listWebFrames = function(cb, exitCb) {
  var isDone = false;
  if (!this.bundleId) {
    logger.error("Can't enter web frame without a bundle ID");
    return cb(new Error("Tried to enter web frame without a bundle ID"));
  }
  var onDone = function(res) {
    this.processingRemoteCmd = false;
    isDone = true;
    cb(res);
  }.bind(this);

  this.processingRemoteCmd = true;
  if (this.remote !== null && this.bundleId !== null) {
    if (this.udid !== null) {
      this.remote.pageArrayFromJson(function(pageArray) {
        cb(pageArray);
      });
    } else {
      this.remote.selectApp(this.bundleId, onDone);
    }
  } else {
      if (this.udid !== null) {
        this.remote = wkrd.init(exitCb);
        this.remote.pageArrayFromJson(function(pageArray) {
          cb(pageArray);
        });
      } else {
        this.remote = new rd.init(exitCb);
        this.remote.connect(function(appDict) {
          if(!_.has(appDict, this.bundleId)) {
            logger.error("Remote debugger did not list " + this.bundleId + " among " +
                         "its available apps");
            if(_.has(appDict, "com.apple.mobilesafari")) {
              logger.info("Using mobile safari instead");
              this.remote.selectApp("com.apple.mobilesafari", onDone);
            } else {
              onDone([]);
            }
          } else {
            this.remote.selectApp(this.bundleId, onDone);
          }
        }.bind(this), this.onPageChange.bind(this));
        var loopCloseRuns = 0;
        var loopClose = function() {
          loopCloseRuns++;
          if (!isDone && loopCloseRuns < 3) {
            this.closeAlertBeforeTest(function(didDismiss) {
              if (!didDismiss) {
                setTimeout(loopClose, 1000);
              }
            });
          }
        }.bind(this);
        setTimeout(loopClose, 4000);
      }
  }
};

IOS.prototype.onPageChange = function(pageArray) {
  logger.info("Remote debugger notified us of a new page listing");
  if (this.selectingNewPage) {
    logger.info("We're in the middle of selecting a page, ignoring");
    return;
  }
  var newIds = []
    , keyId = null;
  _.each(pageArray, function(page) {
    newIds.push(page.id.toString());
    if (page.isKey) {
      keyId = page.id.toString();
    }
  });
  var newPages = [];
  var cachedHandles = _.pluck(this.windowHandleCache, 'id');
  _.each(newIds, function(id) {
    if (!_.contains(cachedHandles, id)) {
      newPages.push(id);
    }
  });
  var newPage = null;
  if (this.curWindowHandle === null) {
    logger.info("We don't appear to have window set yet, ignoring");
  } else if (newPages.length) {
    logger.info("We have new pages, going to select page " + newPages[0]);
    newPage = newPages[0];
  } else if (!_.contains(newIds, this.curWindowHandle.toString())) {
    logger.info("New page listing from remote debugger doesn't contain " +
                 "current window, let's assume it's closed");
    if (keyId !== null) {
      logger.info("Debugger already selected page " + keyId + ", " +
                  "confirming that choice.");
    } else {
      logger.error("Don't have our current window anymore, and there " +
                   "aren't any more to load! Doing nothing...");
    }
    this.curWindowHandle = keyId;
    this.remote.pageIdKey = parseInt(keyId, 10);
  } else {
    var dirty = function() {
      var item = function(arr) {
        return _.filter(arr, function(obj) {
          return obj.id == this.curWindowHandle;
        }, this)[0];
      }.bind(this);

      var win = item(pageArray);
      var ret = false;
      _.each(item(this.windowHandleCache), function(el, idx, l) {
        if (l[idx] !== win[idx]) {
          ret = true;
        }
      });

      return ret;
    }.bind(this);

    // If a window gets navigated to an anchor it doesn't always fire a page callback event
    // Let's check if we wound up in such a situation.
    if (dirty()) {
      this.remote.pageLoad();
    }

    logger.info("New page listing is same as old, doing nothing");
  }

  if (newPage !== null) {
    this.selectingNewPage = true;
    this.remote.selectPage(parseInt(newPage, 10), function() {
      this.selectingNewPage = false;
      this.curWindowHandle = newPage;
      if (this.onPageChangeCb !== null) {
        this.onPageChangeCb();
        this.onPageChangeCb = null;
      }
    }.bind(this));
  } else if (this.onPageChangeCb !== null) {
    this.onPageChangeCb();
    this.onPageChangeCb = null;
  }
  this.windowHandleCache = _.map(pageArray, this.massagePage);
};

IOS.prototype.getAtomsElement = deviceCommon.getAtomsElement;

IOS.prototype.stopRemote = function() {
  if (!this.remote) {
    logger.error("We don't appear to be in a web frame");
    throw new Error("Tried to leave a web frame but weren't in one");
  } else {
    this.remote.disconnect();
    this.curWindowHandle = null;
    this.curWebFrames = [];
    this.curWebCoords = null;
    this.remote = null;
  }
};

IOS.prototype.postCleanup = function(cb) {
  this.curCoords = null;
  this.curOrientation = null;
  if (this.remote) {
    this.stopRemote();
  }

  if (this.reset) {
    this.cleanupAppState(cb);
  } else {
    cb();
  }

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

IOS.prototype.findUIElementOrElements = function(strategy, selector, ctx, many, cb) {
  selector = escapeSpecialChars(selector, "'");
  if (typeof ctx === "undefined" || !ctx) {
    ctx = '';
  } else if (typeof ctx === "string") {
    ctx = escapeSpecialChars(ctx, "'");
    ctx = ", '" + ctx + "'";
  }

  if (strategy === "id") {
    var strings = this.localizableStrings;
    if (strings && strings.length >= 1) selector = strings[0][selector];
  }

  var doFind = function(findCb) {
    var ext = many ? 's' : '';

    var command = "";
    if (strategy === "name") {
      command = ["au.getElement", ext, "ByName('", selector, "'", ctx,")"].join('');
    } else if (strategy === "xpath") {
      command = ["au.getElement", ext, "ByXpath('", selector, "'", ctx, ")"].join('');
    } else if (strategy === "id") {
      command = ["var exact = au.mainApp.getFirstWithPredicateWeighted(\"name == '", selector,
                 "' || label == '", selector, "' || value == '", selector, "'\");"].join('');
      command += ["exact && exact.status == 0 ? exact : au.mainApp.getFirstWith",
                  "PredicateWeighted(\"name contains[c] '", selector, "' || label contains[c] '",
                 selector, "' || value contains[c] '", selector, "'\");"].join('');
    } else {
      command = ["au.getElement", ext, "ByType('", selector, "'", ctx,")"].join('');
    }

    this.proxy(command, function(err, res) {
      this.handleFindCb(err, res, many, findCb);
    }.bind(this));
  }.bind(this);
  if (_.contains(this.supportedStrategies, strategy)) {
    this.waitForCondition(this.implicitWaitMs, doFind, cb);
  } else {
    cb(null, {
      status: status.codes.UnknownError.code
      , value: "Sorry, we don't support the '" + strategy + "' locator " +
               "strategy yet"
    });
  }
};

IOS.prototype.handleFindCb = function(err, res, many, findCb) {
  if (!res) res = {};
  if (res.value === null) {
    res.status = status.codes.NoSuchElement.code;
  }
  if (!err && !many && res.status === 0) {
    findCb(true, err, res);
  } else if (!err && many && res.value !== null && res.value.length > 0) {
    findCb(true, err, res);
  } else {
    findCb(false, err, res);
  }
};

IOS.prototype.findElementNameContains = function(name, cb) {
  var doFind = function(findCb) {
    this.proxy(['au.mainApp.getNameContains("', name, '")'].join(''), function(err, res) {
      if (err || res.status !== 0) {
        findCb(false, err, res);
      } else {
        findCb(true, err, res);
      }
    });
  }.bind(this);
  this.waitForCondition(this.implicitWaitMs, doFind, cb);
};

IOS.prototype.findWebElementOrElements = function(strategy, selector, ctx, many, cb) {
  var ext = many ? 's' : '';
  var atomsElement = this.getAtomsElement(ctx);
  var doFind = function(findCb) {
    this.executeAtom('find_element' + ext, [strategy, selector, atomsElement], function(err, res) {
      this.handleFindCb(err, res, many, findCb);
    }.bind(this));
  }.bind(this);
  this.waitForCondition(this.implicitWaitMs, doFind, cb);
};

IOS.prototype.findElementOrElements = function(strategy, selector, ctx, many, cb) {
  if (this.curWindowHandle) {
    this.findWebElementOrElements(strategy, selector, ctx, many, cb);
  } else {
    this.findUIElementOrElements(strategy, selector, ctx, many, cb);
  }
};

IOS.prototype.findElement = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, false, cb);
};

IOS.prototype.findElements = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, true, cb);
};

IOS.prototype.findElementFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, false, cb);
};

IOS.prototype.findElementsFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, true, cb);
};

IOS.prototype.findAndAct = function(strategy, selector, index, action, actionParams, cb) {
  var stratMap = {'name': 'Name', 'xpath': 'Xpath', 'tag name': 'Type'}
    // if you change these, also change in
    // app/uiauto/appium/app.js:elemForAction
    , supportedActions = ["tap", "isEnabled", "isValid", "isVisible",
                          "value", "name", "label", "setValue", "click",
                          "selectPage", "rect"]
    , many = index > 0;

  if (action === "click") { action = "tap"; }
  var doAction = function(findCb) {
    var cmd = ["au.elemForAction(au.getElement", (many ? 's': ''), "By",
        stratMap[strategy], "('", selector, "'), ", index].join('');
    cmd += ")." + action + "(";
    var strParams = [];
    _.each(actionParams, function(param) {
      param = escapeSpecialChars(param, "'");
      strParams.push("'" + param + "'");
    });
    cmd += strParams.join(', ');
    cmd += ")";
    this.proxy(cmd, function(err, res) {
      if (err || res.status === status.codes.NoSuchElement.code) {
        findCb(false, err, res);
      } else if (many && res.value === []) {
        findCb(false, err, {
          status: status.codes.NoSuchElement.code
          , value: "Could not find element in findAndAct"
        });
      } else {
        findCb(true, err, res);
      }
    });
  }.bind(this);
  if (_.contains(supportedActions, action)) {
    if (_.contains(this.supportedStrategies, strategy)) {
      this.waitForCondition(this.implicitWaitMs, doAction, cb);
    } else {
      cb(null, {
        status: status.codes.UnknownError.code
        , value: "Sorry, we don't support the '" + strategy + "' locator " +
                "strategy yet"
      });
    }
  } else {
    cb(null, {
      status: status.codes.UnknownError.code
      , value: "Sorry, '" + action + "' is not a recognized action"
    });
  }
};

IOS.prototype.setValueImmediate = function(elementId, value, cb) {
  value = escapeSpecialChars(value, "'");
  var command = ["au.getElement('", elementId, "').setValue('", value, "')"].join('');
  this.proxy(command, cb);
};

IOS.prototype.setValue = function(elementId, value, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('click', [atomsElement], function(err, res) {
        if (err) {
          cb(err, res);
        } else {
          this.executeAtom('type', [atomsElement, value], cb);
        }
      }.bind(this));
    }.bind(this));
  } else {
    value = escapeSpecialChars(value, "'");
    // de-escape \n so it can be used specially
    value = value.replace(/\\\\n/g, "\\n");
    var command = ["au.getElement('", elementId, "').setValueByType('", value, "')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.useAtomsElement = deviceCommon.useAtomsElement;

IOS.prototype.click = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('tap', [atomsElement], cb);
    }.bind(this));
  } else {
  if (this.useRobot) {
    var locCmd = "au.getElement('" + elementId + "').rect()";
    this.proxy(locCmd, function(err, res) {
      if (err) return cb(err, res);
      var rect = res.value;
      var pos = {x: rect.origin.x, y: rect.origin.y};
      var size = {w: rect.size.width, h: rect.size.height};
      var tapPoint = { x: pos.x + (size.w/2), y: pos.y + (size.h/2) };
      var tapUrl = this.robotUrl + "/tap/x/" + tapPoint.x + "/y/" + tapPoint.y;
      request.get(tapUrl, {}, cb);
    }.bind(this));
  } else {
      var command = ["au.tapById('", elementId, "')"].join('');
      this.proxy(command, cb);
    }
  }
};

IOS.prototype.touchLongClick = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.getStrings = function(cb) {
  var strings = this.localizableStrings;
  if (strings && strings.length >= 1) strings = strings[0];

  cb(null, {
    status: status.codes.Success.code
    , value: strings
  });
};

IOS.prototype.fireEvent = function(evt, elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('fireEvent', [evt, atomsElement], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.executeAtom = function(atom, args, cb, alwaysDefaultFrame) {
  var counter = this.executedAtomsCounter++;
  var frames = alwaysDefaultFrame === true ? [] : this.curWebFrames;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.remote.executeAtom(atom, args, frames, function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }.bind(this));
  this.lookForAlert(cb, counter, 0, 5000);
};

IOS.prototype.executeAtomAsync = function(atom, args, responseUrl, cb) {
  var counter = this.executedAtomsCounter++;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.asyncResponseCb = cb;
  this.remote.executeAtomAsync(atom, args, this.curWebFrames, responseUrl, function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }.bind(this));
  this.lookForAlert(cb, counter, 0, 5000);
};

IOS.prototype.receiveAsyncResponse = function(asyncResponse) {
  var asyncCb = this.asyncResponseCb;
  //mark returned as true to stop looking for alerts; the js is done.
  this.returnedFromExecuteAtom = true;

  if (asyncCb !== null) {
    this.parseExecuteResponse(asyncResponse, asyncCb);
    asyncCb(null, asyncResponse);
    this.asyncResponseCb = null;
  } else {
    logger.warn("Received async response when we weren't expecting one! " +
                    "Response was: " + JSON.stringify(asyncResponse));
  }
};

IOS.prototype.parseExecuteResponse = deviceCommon.parseExecuteResponse;
IOS.prototype.parseElementResponse = deviceCommon.parseElementResponse;

IOS.prototype.lookForAlert = function(cb, counter, looks, timeout) {
  setTimeout(function(){
    if (typeof looks === 'undefined') {
      looks = 0;
    }
    if (this.instruments !== null) {
      if (!this.returnedFromExecuteAtom[counter] && looks < 11 && !this.selectingNewPage) {
        logger.info("atom did not return yet, checking to see if " +
          "we are blocked by an alert");
        // temporarily act like we're not processing a remote command
        // so we can proxy the alert detection functionality
        this.alertCounter++;
        this.proxy("au.alertIsPresent()", function(err, res) {
          if (res !== null) {
            if (res.value === true) {
              logger.info("Found an alert, returning control to client");
              this.returnedFromExecuteAtom[counter] = true;
              cb(null, {
                status: status.codes.Success.code
                , value: ''
              });
            } else {
              // say we're processing remote cmd again
              looks++;
              setTimeout(this.lookForAlert(cb, counter, looks), 1000);
            }
          }
        }.bind(this));
      }
    }
  }.bind(this), timeout);
};

IOS.prototype.clickCurrent = function(button, cb) {
  var noMoveToErr = {
    status: status.codes.UnknownError.code
    , value: "Cannot call click() before calling moveTo() to set coords"
  };

  if (this.curWindowHandle) {
    if (this.curWebCoords === null) {
      return cb(null, noMoveToErr);
    }
    this.clickWebCoords(cb);
  } else {
    if (this.curCoords === null) {
      return cb(null, noMoveToErr);
    }
    this.clickCoords(this.curCoords, cb);
  }
};

IOS.prototype.clickCoords = function(coords, cb) {
  if (this.useRobot) {
      var tapUrl = this.robotUrl + "/tap/x/" + coords.x + "/y/" + coords.y;
      request.get(tapUrl, {}, cb);
  } else {
    var opts = coords;
    opts.tapCount = 1;
    opts.duration = 0.3;
    opts.touchCount = 1;
    var command =["au.complexTap(" + JSON.stringify(opts) + ")"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.clickWebCoords = function(cb) {
  var coords = this.curWebCoords
    , webviewIndex = this.curWindowHandle - 1
    , wvCmd = "au.getElementsByType('webview')";

  // absolutize web coords
  this.proxy(wvCmd, function(err, res) {
    if (err) return cb(err, res);
    if (typeof res.value[webviewIndex] === "undefined") {
      return cb(null, {
        status: status.codes.UnknownError.code
        , value: "Could not find webview at index " + webviewIndex
      });
    }
    var realDims, wvDims, wvPos;
    var step1 = function() {
      var wvId = res.value[webviewIndex].ELEMENT;
      var locCmd = "au.getElement('" + wvId + "').rect()";
      this.proxy(locCmd, function(err, res) {
        if (err) return cb(err, res);
        var rect = res.value;
        wvPos = {x: rect.origin.x, y: rect.origin.y};
        realDims = {w: rect.size.width, h: rect.size.height};
        next();
      });
    }.bind(this);
    var step2 = function() {
      var cmd = "(function() { return {w: document.width, h: document.height}; })()";
      this.remote.execute(cmd, function(err, res) {
        wvDims = {w: res.result.value.w, h: res.result.value.h};
        next();
      });
    }.bind(this);
    var next = function() {
      if (wvDims && realDims && wvPos) {
        var xRatio = realDims.w / wvDims.w;
        var yRatio = realDims.h / wvDims.h;
        var serviceBarHeight = 20;
        coords = {
          x: wvPos.x + (xRatio * coords.x)
          , y: wvPos.y + (yRatio * coords.y) - serviceBarHeight
        };
        this.clickCoords(coords, cb);
      }
    }.bind(this);
    step1();
    step2();
  }.bind(this));
};

IOS.prototype.submit = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('submit', [atomsElement], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.keyevent = function(keycode, metastate, cb) {
  cb(new NotImplementedError(), null);
};

IOS.prototype.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
  var command
    , options = {
        tapCount: tapCount
        , touchCount: touchCount
        , duration: duration
        , x: x
        , y: y
      };
  var JSONOpts = JSON.stringify(options);
  if (elementId !== null) {
    command = ["au.getElement('", elementId, "').complexTap(", JSONOpts, ')'].join('');
  } else {
    command = ["au.complexTap(", JSONOpts, ")"].join('');
  }
  this.proxy(command, cb);
};

IOS.prototype.clear = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('clear', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').setValue('')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getText = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('get_text', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').text()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getName = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      var script = "return arguments[0].tagName.toLowerCase()";
      this.executeAtom('execute_script', [script, [atomsElement]], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').type()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getAttribute = function(elementId, attributeName, cb) {
  if (this.curWindowHandle) {
    var atomsElement = this.getAtomsElement(elementId);
    if (atomsElement === null) {
      cb(null, {
        status: status.codes.UnknownError.code
        , value: "Error converting element ID for using in WD atoms: " + elementId
      });
    } else {
      this.executeAtom('get_attribute_value', [atomsElement, attributeName], cb);
    }
  } else {
    if (_.contains(['label', 'name', 'value', 'values'], attributeName)) {
      var command = ["au.getElement('", elementId, "').", attributeName, "()"].join('');
      this.proxy(command, cb);
    } else {
      cb(null, {
        status: status.codes.UnknownCommand.code
        , value: "UIAElements don't have the attribute '" + attributeName + "'"
      });
    }
  }
};

IOS.prototype.getLocation = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('get_top_left_coordinates', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId,
      "').getElementLocation()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getSize = function(elementId, cb) {
  if (this.curWindowHandle) {
    var atomsElement = this.getAtomsElement(elementId);
    if (atomsElement === null) {
      cb(null, {
        status: status.codes.UnknownError.code
        , value: "Error converting element ID for using in WD atoms: " + elementId
      });
    } else {
      this.executeAtom('get_size', [atomsElement], cb);
    }
  } else {
    var command = ["au.getElement('", elementId, "').getElementSize()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getWindowSize = function(windowHandle, cb) {
  if (this.curWindowHandle) {
    if(windowHandle !== "current") {
      cb(null, {
        status: status.codes.NoSuchWindow.code
        , value: "Currently only getting current window size is supported."
      });
    } else {
      this.executeAtom('get_window_size', [], function(err, res) {
        cb(null, {
          status: status.codes.Success.code
          , value: res
        });
      });
    }
  } else {
    if(windowHandle !== "current") {
      cb(null, {
        status: status.codes.NoSuchWindow.code
        , value: "Can only get the status of the current window"
      });
    } else {
      this.proxy("au.getWindowSize()", cb);
    }
  }
};

IOS.prototype.mobileSafariNav = function(navBtnName, cb) {
  this.findUIElementOrElements('xpath', '//toolbar/button[@name="' + navBtnName + '"]',
      null, false, function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var cmd = "au.getElement(" + res.value.ELEMENT + ").tap()";
      this.remote.willNavigateWithoutReload = true;
      this.proxy(cmd, cb);
    }
  }.bind(this));
};

IOS.prototype.back = function(cb) {
  if (this.curWindowHandle === null) {
    var command = "au.back();";
    this.proxy(command, cb);
  } else {
    this.mobileSafariNav("Back", cb);
  }
};

IOS.prototype.forward = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.mobileSafariNav("Forward", cb);
  }
};

IOS.prototype.refresh = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.executeAtom('refresh', [], cb);
  }
};

IOS.prototype.getPageIndex = function(elementId, cb) {
  if (this.curWindowHandle) {
    cb(new NotImplementedError(), null);
  } else {
    var command = ["au.getElement('", elementId, "').pageIndex()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.keys = function(keys, cb) {
  keys = escapeSpecialChars(keys, "'");
  if (this.curWindowHandle) {
    this.active(function(err, res) {
      if (err || typeof res.value.ELEMENT === "undefined") {
        return cb(err, res);
      }
      this.setValue(res.value.ELEMENT, keys, cb);
    }.bind(this));
  } else {
    var command = ["au.sendKeysToActiveElement('", keys ,"')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.frame = function(frame, cb) {
  if (this.curWindowHandle) {
    var atom;
    if (frame === null) {
      this.curWebFrames = [];
      logger.info("Leaving web frame and going back to default content");
      cb(null, {
        status: status.codes.Success.code
        , value: ''
      });
    } else {
      if (typeof frame.ELEMENT !== "undefined") {
        this.useAtomsElement(frame.ELEMENT, cb, function(atomsElement) {
          this.executeAtom('get_frame_window', [atomsElement], function(err, res) {
            if (this.checkSuccess(err, res, cb)) {
              logger.info("Entering new web frame: " + res.value.WINDOW);
              this.curWebFrames.unshift(res.value.WINDOW);
              cb(err, res);
            }
          }.bind(this));
        }.bind(this));
      } else {
        atom = "frame_by_id_or_name";
        if (typeof frame === "number") {
          atom = "frame_by_index";
        }
        this.executeAtom(atom, [frame], function(err, res) {
          if (this.checkSuccess(err, res, cb)) {
            if (res.value === null || typeof res.value.WINDOW === "undefined") {
              cb(null, {
                status: status.codes.NoSuchFrame.code
                , value: ''
              });
            } else {
              logger.info("Entering new web frame: " + res.value.WINDOW);
              this.curWebFrames.unshift(res.value.WINDOW);
              cb(err, res);
            }
          }
        }.bind(this));
      }
    }
  } else {
    frame = frame? frame : 'target.frontMostApp()';
    var command = ["wd_frame = ", frame].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.implicitWait = function(ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.info("Set iOS implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

IOS.prototype.asyncScriptTimeout = function(ms, cb) {
  this.asyncWaitMs = parseInt(ms, 10);
  logger.info("Set iOS async script timeout to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

IOS.prototype.elementDisplayed = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_displayed', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isDisplayed()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_enabled', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() === 1"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementSelected = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_selected', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isSelected()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getCssProperty = function(elementId, propertyName, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('get_value_of_css_property', [atomsElement,
        propertyName], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.getPageSource = function(cb) {
  if (this.curWindowHandle) {
    this.processingRemoteCmd = true;
    var cmd = 'document.getElementsByTagName("html")[0].outerHTML';
    this.remote.execute(cmd, function (err, res) {
      if (err) {
        cb("Remote debugger error", {
          status: status.codes.UnknownError.code
          , value: res
        });
      } else {
        cb(null, {
          status: status.codes.Success.code
          , value: res.result.value
        });
      }
      this.processingRemoteCmd = false;
    }.bind(this));
  } else {
    this.proxy("wd_frame.getPageSource()", cb);
  }
};

IOS.prototype.getPageSourceXML = IOS.prototype.getPageSource;

IOS.prototype.waitForPageLoad = function(timeout, cb) {
  this.proxy("au.waitForPageLoad(" + timeout + ")", cb);
};

IOS.prototype.getAlertText = function(cb) {
  this.proxy("au.getAlertText()", cb);
};

IOS.prototype.setAlertText = function(text, cb) {
  text = escapeSpecialChars(text, "'");
  this.proxy("au.setAlertText('" + text + "')", cb);
};

IOS.prototype.postAcceptAlert = function(cb) {
  this.proxy("au.acceptAlert()", cb);
};

IOS.prototype.postDismissAlert = function(cb) {
  this.proxy("au.dismissAlert()", cb);
};

IOS.prototype.lock = function(secs, cb) {
  this.proxy(["au.lock(", secs, ")"].join(''), cb);
};

IOS.prototype.background = function(secs, cb) {
  this.proxy(["au.background(", secs, ")"].join(''), cb);
};

IOS.prototype.getOrientation = function(cb) {
  this.proxy("au.getScreenOrientation()", cb);
};

IOS.prototype.setOrientation = function(orientation, cb) {
  var command = ["au.setScreenOrientation('", orientation ,"')"].join('');
  this.proxy(command, function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      this.curOrientation = orientation;
      cb(err, res);
    }
  }.bind(this));
};

IOS.prototype.localScreenshot = function(desiredFile, cb) {
  // Instruments automatically adds .png
  var screenshotFolder = "/tmp/appium-instruments/Run 1/";
  var filename = path.basename(desiredFile, path.extname(desiredFile));
  var command = "au.capture('" + filename + "')";
  var filePath = screenshotFolder + filename;

  // Must delete the png if it exists or instruments will
  // add a sequential integer to the file name.
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  async.series([
    function (cb) { this.proxy(command, cb); }.bind(this),
    function (cb) {
      var srcFile = filePath + ".png";
      var waitForFile = function() {
        if (fs.existsSync(srcFile)) {
          var desiredFolder = path.dirname(desiredFile);
          mkdirp.sync(desiredFolder);
          fs.rename(filePath + ".png", desiredFile, cb);
        } else {
          setTimeout(waitForFile, 500);
        }
      };
      waitForFile();
      // must exist or rename will fail.
    },
  ], function(){
    cb(null, {
       status: status.codes.Success.code
       , value: true
     });
  });
};

IOS.prototype.getScreenshot = function(cb) {
  var guid = uuid.create();
  var command = ["au.capture('screenshot", guid ,"')"].join('');

  var screenshotFolder = "/tmp/appium-instruments/Run 1/";
  if (!fs.existsSync(screenshotFolder)) {
    mkdirp.sync(screenshotFolder);
  }

  var shotPath = [screenshotFolder, 'screenshot', guid, ".png"].join("");
  this.proxy(command, function(err, response) {
    if (err) {
      cb(err, response);
    } else {
      var delayTimes = 0;
      var onErr = function() {
        delayTimes++;
        var next = function() {
          if (delayTimes <= 10) {
            read(onErr);
          } else {
            read();
          }
        };
        setTimeout(next, 300);
      };
      var read = function(onErr) {
        var doRead = function() {
          fs.readFile(shotPath, function read(err, data) {
            if (err) {
              if (onErr) {
                return onErr();
              } else {
                response = null;
                err = new Error("Timed out waiting for screenshot file. " + err.toString());
              }
            } else {
              var b64data = new Buffer(data).toString('base64');
              response.value = b64data;
            }
            cb(err, response);
          });
        };
        if (this.curOrientation === "LANDSCAPE") {
          // need to rotate 90 deg CC
          logger.info("Rotating landscape screenshot");
          rotateImage(shotPath, -90, function(err) {
            if (err && onErr) {
              return onErr();
            } else if (err) {
              cb(new Error("Could not rotate screenshot appropriately"), null);
            } else {
              doRead();
            }
          });
        } else {
          doRead();
        }
      }.bind(this);
      read(onErr);
    }
  }.bind(this));
};

IOS.prototype.fakeFlick = function(xSpeed, ySpeed, swipe, cb) {
  var command = "";
  if (swipe) {
    command = ["au.touchSwipeFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }
  else {
    command = ["au.touchFlickFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }

  this.proxy(command, cb);
};

IOS.prototype.fakeFlickElement = function(elementId, xoffset, yoffset, speed, cb) {
  var command = ["au.getElement('", elementId, "').touchFlick(", xoffset, ",", yoffset, ",", speed, ")"].join('');

  this.proxy(command, cb);
};

IOS.prototype.drag = function(startX, startY, endX, endY, steps, elementId, destElId, cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.swipe = function(startX, startY, endX, endY, duration, touchCount, elId, cb) {
  var command;
  if (elId) {
    command = ["au.getElement('", elId, "').swipe(", startX, ',', startY, ',',
      endX, ',', endY, ',', duration, ',', touchCount, ")"].join('');
  } else {
    command = ["au.swipe(", startX, ',', startY, ',', endX, ',', endY, ',',
      duration, ")"].join('');
  }
  // wait for device to complete swipe
  this.proxy(command, function(err, res) {
    setTimeout(function() {
      cb(err, res);
    }, duration * 1000);
  });
};

IOS.prototype.rotate = function(x, y, radius, rotation, duration, touchCount, elId, cb) {
  var command;
  var location = {'x' : x, 'y' : y};
  var options = {'duration' : duration, 'radius' : radius, 'rotation' : rotation, 'touchCount' : touchCount};
  if (elId) {
    command = "au.getElement('" + elId + "').rotateWithOptions(" + JSON.stringify(location) +
              "," + JSON.stringify(options) + ")";
    this.proxy(command, cb);
  } else {
    this.proxy("target.rotateWithOptions("+ JSON.stringify(location) + "," + JSON.stringify(options) + ")", cb);
  }
};

IOS.prototype.pinchClose = function(startX, startY, endX, endY, duration, elId, cb) {
  var command;
  var fromPointObject = {'x' : startX, 'y' : startY};
  var toPointObject = {'x' : endX, 'y' : endY};
  if (elId) {
    command = ["au.getElement('", elId, "').pinchCloseFromToForDuration(", JSON.stringify(fromPointObject),  ",",  JSON.stringify(toPointObject), ",",
              duration, ")"].join('');
    this.proxy(command, cb);
  } else {
    this.proxy("target.pinchCloseFromToForDuration("+ JSON.stringify(fromPointObject) + "," + JSON.stringify(toPointObject) + "," + duration +")", cb);
  }
};

IOS.prototype.pinchOpen = function(startX, startY, endX, endY, duration, elId, cb) {
  var command;
  var fromPointObject = {'x' : startX, 'y' : startY};
  var toPointObject = {'x' : endX, 'y' : endY};
  if (elId) {
    command = ["au.getElement('", elId, "').pinchOpenFromToForDuration("+ JSON.stringify(fromPointObject) + "," + JSON.stringify(toPointObject) + "," + duration +")"];
    this.proxy(command, cb);
  } else {
    this.proxy("target.pinchOpenFromToForDuration("+ JSON.stringify(fromPointObject) + "," + JSON.stringify(toPointObject) + "," + duration +")", cb);
  }
};

IOS.prototype.flick = function(startX, startY, endX, endY, touchCount, elId, cb) {
  var command;
  if (elId) {
    command = ["au.getElement('", elId, "').flick(", startX, ',', startY, ',',
      endX, ',', endY, ',', touchCount, ")"].join('');
  } else {
    command = ["au.flickApp(", startX, ',', startY, ',', endX, ',', endY,
      ")"].join('');
  }
  this.proxy(command, cb);
};

IOS.prototype.scrollTo = function(elementId, text, cb) {
    // we ignore text for iOS, as the element is the one being scrolled too
    var command = ["au.getElement('", elementId, "').scrollToVisible()"].join('');
    this.proxy(command, cb);
};

IOS.prototype.shake = function(cb) {
  this.proxy("au.shake()", cb);
};

IOS.prototype.setLocation = function(latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
  var coordinates = {'latitude' : latitude, 'longitude' : longitude};
  var hasOptions = altitude !== null || horizontalAccuracy !== null || verticalAccuracy !== null || course !== null || speed !== null;
  if (hasOptions) {
    var options = {};
    if (altitude !== null) {
      options.altitude = altitude;
    }
    if (horizontalAccuracy !== null) {
      options.horizontalAccuracy = horizontalAccuracy;
    }
    if (verticalAccuracy !== null) {
      options.verticalAccuracy = verticalAccuracy;
    }
    if (course !== null) {
      options.course = course;
    }
    if (speed !== null) {
      options.speed = speed;
    }
    this.proxy("target.setLocationWithOptions("+ JSON.stringify(coordinates) + "," + JSON.stringify(options) +")", cb);
  } else {
    this.proxy("target.setLocation(" + JSON.stringify(coordinates) + ")", cb);
  }
};

IOS.prototype.hideKeyboard = function(keyName, cb) {
  if (typeof keyName !== "string") {
    keyName = "Hide keyboard";
  }
  this.proxy("au.hideKeyboard('"+keyName+"')", cb);
};

IOS.prototype.url = function(url, cb) {
  if (this.curWindowHandle) {
    // make sure to clear out any leftover web frames
    this.curWebFrames = [];
    this.processingRemoteCmd = true;
    this.remote.navToUrl(url, function() {
      cb(null, {
        status: status.codes.Success.code
        , value: ''
      });
      this.processingRemoteCmd = false;
    }.bind(this));
  } else {
    // in the future, detect whether we have a UIWebView that we can use to
    // make sense of this command. For now, and otherwise, it's a no-op
    cb(null, {status: status.codes.Success.code, value: ''});
  }
};

IOS.prototype.getUrl = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.processingRemoteCmd = true;
    this.remote.execute('window.location.href', function (err, res) {
      if (err) {
        cb("Remote debugger error", {
          status: status.codes.JavaScriptError.code
          , value: res
        });
      } else {
        cb(null, {
          status: status.codes.Success.code
          , value: res.result.value
        });
      }
      this.processingRemoteCmd = false;
    }.bind(this));
  }
};

IOS.prototype.active = function(cb) {
  if (this.curWindowHandle) {
    this.executeAtom('active_element', [], function(err, res) {
      cb(err, res);
    });
  } else {
    this.proxy("au.getActiveElement()", cb);
  }
};

IOS.prototype.getWindowHandle = function(cb) {
  var err = null, response = null;
  if (this.curWindowHandle) {
    response = {
      status: status.codes.Success.code
      , value: this.curWindowHandle
    };
  } else {
    response = {
      status: status.codes.NoSuchWindow.code
      , value: null
    };
  }
  cb(err, response);
};

IOS.prototype.massagePage = function(page) {
  page.id = page.id.toString();
  return page;
};

IOS.prototype.getWindowHandles = function(cb) {
  this.listWebFrames(function(pageArray) {
    this.windowHandleCache = _.map(pageArray, this.massagePage);
    cb(null, {
      status: status.codes.Success.code
      , value: _.pluck(this.windowHandleCache, 'id')
    });
  }.bind(this));
};

IOS.prototype.setWindow = function(name, cb) {
  if (_.contains(_.pluck(this.windowHandleCache, 'id'), name)) {
    var pageIdKey = parseInt(name, 10);
    var next = function() {
      this.processingRemoteCmd = true;
      if(this.udid === null) {
        this.remote.selectPage(pageIdKey, function() {
          this.curWindowHandle = pageIdKey.toString();
          cb(null, {
            status: status.codes.Success.code
            , value: ''
          });
          this.processingRemoteCmd = false;
        }.bind(this));
      } else {
        if (name == this.curWindowHandle){
          logger.info("Remote debugger is already connected to window [" + name + "]");
          cb(null, {
            status: status.codes.Success.code
            , value: name
          });
        } else if (_.contains(_.pluck(this.windowHandleCache, 'id'), name)) {
          this.remote.disconnect();
          this.curWindowHandle = name;
          this.remote.connect(name, function(){
            cb(null, {
              status: status.codes.Success.code
            , value: name
            });
          });
        } else {
          cb(null, {
            status: status.codes.NoSuchWindow.code
            , value: null
          });
        }
      }
    }.bind(this);
    next();
  } else {
    cb(null, {
      status: status.codes.NoSuchWindow.code
      , value: null
    });
  }
};

IOS.prototype.closeWindow = function(cb) {
  if (this.curWindowHandle) {
    var script = "return window.setTimeout(function() { window.close(); }, 1000);";
    this.executeAtom('execute_script', [script, []], function(err, res) {
      setTimeout(function() {
        cb(err, res);
      }, 500);
    }, true);
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.setSafariWindow = function(windowId, cb) {
  this.findAndAct('name', 'Pages', 0, 'value', [], function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      if (res.value === "") {
        cb(err, res);
      } else {
        this.findAndAct('name', 'Pages', 0, 'tap', [], function(err, res) {
          if (this.checkSuccess(err, res, cb)) {
            this.findAndAct('tag name', 'pageIndicator', 0, 'selectPage', [windowId], function(err, res) {
              if (this.checkSuccess(err, res, cb)) {
                this.findAndAct('name', 'Done', 0, 'tap', [], cb);
              }
            }.bind(this));
          }
        }.bind(this));
      }
    }
  }.bind(this));
};

IOS.prototype.checkSuccess = function(err, res, cb) {
  if (typeof res === "undefined") {
    cb(err, {
      status: status.codes.UnknownError.code
      , value: "Did not get valid response from execution. Expected res to " +
               "be an object and was " + JSON.stringify(res)
    });
    return false;
  } else if (err || res.status !== status.codes.Success.code) {
    cb(err, res);
    return false;
  }
  return true;
};

IOS.prototype.leaveWebView = function(cb) {
  if (this.curWindowHandle === null) {
    cb(null, {
      status: status.codes.NoSuchFrame.code
      , value: "We are not in a webview, so can't leave one!"
    });
  } else {
    this.curWindowHandle = null;
    //TODO: this condition should be changed to check if the webkit protocol is being used.
    if(this.udid){
      this.remote.disconnect();
      this.curWindowHandle = null;
    }
    cb(null, {
      status: status.codes.Success.code
      , value: ''
    });
  }
};

IOS.prototype.execute = function(script, args, cb) {
  if (this.curWindowHandle === null) {
    this.proxy(script, cb);
  } else {
    this.convertElementForAtoms(args, function(err, res) {
      if (err) {
        cb(null, res);
      } else {
        this.executeAtom('execute_script', [script, res], cb);
      }
    }.bind(this));
  }
};

IOS.prototype.executeAsync = function(script, args, responseUrl, cb) {
  if (this.curWindowHandle === null) {
    this.proxy(script, cb);
  } else {
    this.convertElementForAtoms(args, function(err, res) {
      if (err) {
        cb(null, res);
      } else {
        this.executeAtomAsync('execute_async_script', [script, args, this.asyncWaitMs], responseUrl, cb);
      }
    }.bind(this));
  }
};

IOS.prototype.convertElementForAtoms = deviceCommon.convertElementForAtoms;

IOS.prototype.title = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.executeAtom('title', [], cb, true);
  }
};

IOS.prototype.moveTo = function(element, xoffset, yoffset, cb) {
  this.getLocation(element, function(err, res) {
    if (err) return cb(err, res);
    var coords = {
      x: res.value.x + xoffset
      , y: res.value.y + yoffset
    };
    //console.log("moving mouse to coords:");
    //console.log(coords);
    if (this.curWindowHandle) {
      this.curWebCoords = coords;
      this.useAtomsElement(element, cb, function(atomsElement) {
        var relCoords = {x: xoffset, y: yoffset};
        this.executeAtom('move_mouse', [atomsElement, relCoords], cb);
      }.bind(this));
    } else {
      this.curCoords = coords;
      cb(null, {
        status: status.codes.Success.code
        , value: null
      });
    }
  }.bind(this));
};

IOS.prototype.equalsWebElement = function(element, other, cb) {
  var ctxElem = this.getAtomsElement(element);
  var otherElem = this.getAtomsElement(other);
  var retStatus = status.codes.Success.code
    , retValue = false;

  // We assume it's referrencing the same element if it's equal
  if (ctxElem.ELEMENT === otherElem.ELEMENT) {
    retValue = true;
    cb(null, {
      status: retStatus
      , value: retValue
    });
  } else {
    // ...otherwise let the browser tell us.
    this.executeAtom('element_equals_element', [ctxElem.ELEMENT, otherElem.ELEMENT], cb);
  }
};

IOS.prototype.getCookies = function(cb) {
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  var script = "return document.cookie";
  this.executeAtom('execute_script', [script, []], function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var cookies;
      try {
        cookies = parseWebCookies(res.value);
      } catch(e) {
        return cb(null, {
          status: status.codes.UnknownError.code
          , value: "Error parsing cookies from result, which was " + res.value
        });
      }
      cb(null, {
        status: status.codes.Success.code
        , value: cookies
      });
    }
  }.bind(this), true);

};

IOS.prototype.setCookie = function(cookie, cb) {
  var expiry = null;
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  var webCookie = encodeURIComponent(cookie.name) + "=" +
                  encodeURIComponent(cookie.value);
  if (cookie.value !== "" && typeof cookie.expiry === "number") {
    expiry = (new Date(cookie.expiry * 1000)).toGMTString();
  } else if (cookie.value === "") {
    expiry = (new Date(0)).toGMTString();
  }
  if (expiry) {
    webCookie += "; expires=" + expiry;
  }
  var script = "document.cookie = " + JSON.stringify(webCookie);
  this.executeAtom('execute_script', [script, []], function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      cb(null, {
        status: status.codes.Success.code
        , value: true
      });
    }
  }.bind(this), true);
};

IOS.prototype.deleteCookie = function(cookieName, cb) {
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  var cookie = {name: cookieName, value: ""};
  this.setCookie(cookie, cb);
};

IOS.prototype.deleteCookies = function(cb) {
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  this.getCookies(function(err, res) {
    if (this.checkSuccess(err, res)) {
      var numCookies = res.value.length;
      var cookies = res.value;
      if (numCookies) {
        var returned = false;
        var deleteNextCookie = function(cookieIndex) {
          if (!returned) {
            var cookie = cookies[cookieIndex];
            this.deleteCookie(cookie.name, function(err, res) {
              if (err || res.status !== status.codes.Success.code) {
                returned = true;
                cb(err, res);
              } else if (cookieIndex < cookies.length - 1) {
                deleteNextCookie(cookieIndex + 1);
              } else {
                returned = true;
                cb(null, {
                  status: status.codes.Success.code
                  , value: true
                });
              }
            });
          }
        }.bind(this);
        deleteNextCookie(0);
      } else {
        cb(null, {
          status: status.codes.Success.code
          , value: false
        });
      }
    }
  }.bind(this));
};

IOS.prototype.getCurrentActivity= function(cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.getLogs = function(logType, cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.getLogTypes = function(cb) {
  cb(new NotYetImplementedError(), null);
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

module.exports = function(args) {
  return new IOS(args);
};
