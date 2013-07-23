"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , glob = require('glob')
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
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
  , NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError
  , UnknownError = errors.UnknownError;

var IOS = function(args) {
  this.rest = args.rest;
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
  this.supportedStrategies = ["name", "tag name", "xpath"];
};

IOS.prototype.cleanup = function(cb) {
  if (this.removeTraceDir) {
    glob("*.trace", {}, function(err, files) {
      if (err) {
        logger.error("Could not glob for tracedirs: " + err.message);
      } else {
        _.each(files, function(file) {
          file = path.resolve(process.cwd(), file);
          rimraf(file, function() {
            logger.info("Cleaned up " + file);
          });
        });
      }
    });
  }

  rimraf(sock, function() {
    logger.info("Cleaned up instruments socket " + sock);
    cb();
  });
};

IOS.prototype.start = function(cb, onDie) {
  if (this.app && this.bundleId) {
    logger.warn("You tried to launch instruments with both an app " +
                "specification and a bundle ID. Sticking with the app");
  }
  var me = this;
  var didLaunch = false;
  if (typeof onDie === "function") {
    this.onStop = onDie;
  }

  var onLaunch = function() {
    didLaunch = true;
    logger.info('Instruments launched. Starting poll loop for new commands.');
    me.instruments.setDebug(true);
    var setLocationServicesPref = function(oCb) {
      var cmd = "setBootstrapConfig: useLocationServices=" +
                JSON.stringify(me.useLocationServices);
      me.proxy(cmd, oCb);
    };
    var navToWebview = function() {
      if (me.autoWebview) {
        me.navToFirstAvailWebview(cb);
      } else {
        cb(null);
      }
    };
    var setOrientation = function(oCb) {
      if (typeof me.startingOrientation === "string" && _.contains(["LANDSCAPE", "PORTRAIT"], me.startingOrientation.toUpperCase())) {
        logger.info("Setting initial orientation to " + me.startingOrientation);
        var command = ["au.setScreenOrientation('",
          me.startingOrientation.toUpperCase(),"')"].join('');
        me.proxy(command, function(err, res) {
          if (err || res.status !== status.codes.Success.code) {
            logger.warn("Setting initial orientation did not work!");
          } else {
            me.curOrientation = me.startingOrientation;
          }
          oCb(null);
        });
      } else {
        oCb(null);
      }
    };
    var next = function() {
      setOrientation(function() {
        setLocationServicesPref(function() {
          navToWebview();
        });
      });
    };
    if (me.bundleId !== null) {
      next();
    } else {
      me.proxy('au.bundleId()', function(err, bId) {
        logger.info('Bundle ID for open app is ' + bId.value);
        me.bundleId = bId.value;
        next();
      });
    }
  };

  var onExit = function(code, traceDir) {
    if (!didLaunch) {
      logger.error("Instruments did not launch successfully, failing session");
      return cb("Instruments did not launch successfully--please check your app " +
          "paths or bundle IDs and try again");
      //code = 1; // this counts as an error even if instruments doesn't think so
    }

    if (typeof me.cbForCurrentCmd === "function") {
      // we were in the middle of waiting for a command when it died
      // so let's actually respond with something
      var error = new UnknownError("Instruments died while responding to " +
                                   "command, please check appium logs");
      me.cbForCurrentCmd(error, null);
      code = 1; // this counts as an error even if instruments doesn't think so
    }
    me.instruments = null;
    me.curCoords = null;
    me.curOrientation = null;
    if (me.remote !== null) {
      try {
        me.stopRemote();
      } catch(e) {
        logger.info("Error stopping remote: " + e.name + ": " + e.message);
      }
    }
    var nexts = 0;
    var next = function() {
      me.bundleId = null;
      nexts++;
      if (nexts === 2) {
        me.onStop(code);
        me.onStop = null;
      }
    };
    if (me.removeTraceDir && traceDir) {
      rimraf(traceDir, function() {
        logger.info("Deleted tracedir we heard about from instruments (" + traceDir + ")");
        next();
      });
    } else {
      next();
    }

    if (me.reset) {
      me.cleanupAppState(next);
    } else {
      next();
    }
  };

  if (this.instruments === null) {
    var createInstruments = function(cb) {
      logger.debug("Creating instruments");
      me.instruments = instruments(
        me.app || me.bundleId
        , me.udid
        , path.resolve(__dirname, 'uiauto/bootstrap.js')
        , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
        , sock
        , me.withoutDelay
        , me.webSocket
        , onLaunch
        , onExit
      );
    };

    async.series([
      function (cb) { me.cleanup(cb); },
      function (cb) { me.setDeviceType(cb); },
      function (cb) { me.installToRealDevice(cb); },
      function (cb) { createInstruments(cb); }
    ], cb);
  }
};

IOS.prototype.installToRealDevice = function (cb) {
  if (this.udid && this.ipa && this.bundleId) {
    logger.info("Installing ipa found at " + this.ipa);
    this.realDevice = new IDevice(this.udid);

    var d = this.realDevice
        , me = this;

    async.waterfall([
      function (cb) { d.isInstalled(me.bundleId, cb); },
      function (installed, cb) {
      if (installed) {
          logger.info("Bundle found on device, removing before reinstalling.");
          d.remove(me.bundleId, cb);
        } else {
          logger.debug("Nothing found on device, going ahead and installing.");
          cb();
        }
      },
      function (cb) { d.installAndWait(me.ipa, me.bundleId, cb); }
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
      if (err) {
        logger.error("Could not parse plist file at " + plist);
        cb(err);
      } else {
        logger.info("Parsed app Info.plist");
        obj[0].UIDeviceFamily = [deviceTypeCode];
        var newPlist = bplistCreate(obj);
        fs.writeFile(plist, newPlist, function(err) {
          if (err) {
            logger.error("Could not save new binary Info.plist");
            cb(err);
          } else {
            logger.info("Wrote new app Info.plist with device type");
            cb(null);
          }
        });
      }
    });
  }
};


IOS.prototype.navToFirstAvailWebview = function(cb) {
  logger.info("Navigating to first available webview");
  this.getWindowHandles(_.bind(function(err, res) {
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
  }, this));
};

IOS.prototype.closeAlertBeforeTest = function(cb) {
  this.proxy("au.alertIsPresent()", _.bind(function(err, res) {
    if (!err && res !== null && typeof res.value !== "undefined" && res.value === true) {
      logger.info("Alert present before starting test, let's banish it");
      this.proxy("au.dismissAlert()", function() {
        logger.info("Alert banished!");
        cb(true);
      });
    } else {
      cb(false);
    }
  }, this));
};

IOS.prototype.cleanupAppState = function(cb) {
  var user = process.env.USER
    , me = this;
  logger.info("Deleting plists for bundle: " + this.bundleId);
  glob("/Users/" + user + "/Library/Application Support/iPhone Simulator/**/" +
       me.bundleId + "*.plist", {}, function(err, files) {
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
        if (me.realDevice) {
          me.realDevice.remove(me.bundleId, function (err) {
            if (err) {
              logger.error("Could not remove " + me.bundleId + " from device");
              cb(err);
            } else {
              logger.info("Removed " + me.bundleId);
              cb();
            }
          });
        } else {
          cb();
        }
      }
    }
  });
};

IOS.prototype.listWebFrames = function(cb, exitCb) {
  var me = this
    , isDone = false;
  if (!this.bundleId) {
    logger.error("Can't enter web frame without a bundle ID");
    return cb(new Error("Tried to enter web frame without a bundle ID"));
  }
  var onDone = function(res) {
    me.processingRemoteCmd = false;
    isDone = true;
    cb(res);
  };

  this.processingRemoteCmd = true;
  if (this.remote !== null && this.bundleId !== null) {
    if (this.udid !== null) {
      me.remote.pageArrayFromJson(function(pageArray) {
        cb(pageArray);
      });
    } else {
      this.remote.selectApp(this.bundleId, onDone);
    }
  } else {
      if (this.udid !== null) {
        this.remote = wkrd.init(exitCb);
        me.remote.pageArrayFromJson(function(pageArray) {
          cb(pageArray);
        });
      } else {
        this.remote = new rd.init(exitCb);
        this.remote.connect(function(appDict) {
          if(!_.has(appDict, me.bundleId)) {
            logger.error("Remote debugger did not list " + me.bundleId + " among " +
                         "its available apps");
            if(_.has(appDict, "com.apple.mobilesafari")) {
              logger.info("Using mobile safari instead");
              me.remote.selectApp("com.apple.mobilesafari", onDone);
            } else {
              onDone([]);
            }
          } else {
            me.remote.selectApp(me.bundleId, onDone);
          }
        }, _.bind(me.onPageChange, me));
        var loopCloseRuns = 0;
        var loopClose = function() {
          loopCloseRuns++;
          if (!isDone && loopCloseRuns < 3) {
            me.closeAlertBeforeTest(function(didDismiss) {
              if (!didDismiss) {
                setTimeout(loopClose, 1000);
              }
            });
          }
        };
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
    , keyId = null
    , me = this;
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
  } else if (!_.contains(newIds, me.curWindowHandle.toString())) {
    logger.info("New page listing from remote debugger doesn't contain " +
                 "current window, let's assume it's closed");
    if (keyId !== null) {
      logger.info("Debugger already selected page " + keyId + ", " +
                  "confirming that choice.");
    } else {
      logger.error("Don't have our current window anymore, and there " +
                   "aren't any more to load! Doing nothing...");
    }
    me.curWindowHandle = keyId;
    me.remote.pageIdKey = parseInt(keyId, 10);
  } else {
    var dirty = function() {
      var item = function(arr) {
        return _.filter(arr, function(obj) {
          return obj.id == me.curWindowHandle;
        })[0];
      };

      var win = item(pageArray);
      var ret = false;
      _.each(item(me.windowHandleCache), function(el, idx, l) {
        if (l[idx] !== win[idx]) {
          ret = true;
        }
      });

      return ret;
    };

    // If a window gets navigated to an anchor it doesn't always fire a page callback event
    // Let's check if we wound up in such a situation.
    if (dirty()) {
      me.remote.pageLoad();
    }

    logger.info("New page listing is same as old, doing nothing");
  }

  if (newPage !== null) {
    this.selectingNewPage = true;
    this.remote.selectPage(parseInt(newPage, 10), function() {
      me.selectingNewPage = false;
      me.curWindowHandle = newPage;
      if (me.onPageChangeCb !== null) {
        me.onPageChangeCb();
        me.onPageChangeCb = null;
      }
    });
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

IOS.prototype.stop = function(cb) {
  if (this.remote) {
    this.stopRemote();
  }
  if (this.instruments === null) {
    logger.info("Trying to stop instruments but it already exited");
    // we're already stopped
    cb();
  } else {
    var me = this;
    if (cb) {
      this.onStop = cb;
    }

    this.instruments.shutdown();
    me.queue = [];
    me.progress = 0;
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
  var me = this;

  var next = function() {
    if (me.queue.length <= 0 || me.progress > 0) {
      return;
    }

    var target = me.queue.shift()
    , command = target[0]
    , cb = target[1];

    if (me.selectingNewPage && me.curWindowHandle) {
      logger.info("We're in the middle of selecting a new page, " +
                  "waiting to run next command until done");
      setTimeout(next, 500);
      me.queue.unshift(target);
      return;
    } else if (me.curWindowHandle && me.processingRemoteCmd) {
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
        me.queue.unshift(target);
        return;
      }
    }

    me.cbForCurrentCmd = cb;

    me.progress++;
    logger.debug("Sending command to instruments: " + command);
    me.instruments.sendCommand(command, function(response) {
      me.cbForCurrentCmd = null;
      if (typeof cb === 'function') {
        me.respond(response, cb);
      }

      // maybe there's moar work to do
      me.progress--;
      next();
    });
  };

  next();
};

IOS.prototype.findUIElementOrElements = function(strategy, selector, ctx, many, cb) {
  var me = this;
  selector = escapeSpecialChars(selector, "'");
  if (typeof ctx === "undefined" || !ctx) {
    ctx = '';
  } else if (typeof ctx === "string") {
    ctx = escapeSpecialChars(ctx, "'");
    ctx = ", '" + ctx + "'";
  }
  var doFind = function(findCb) {
    var ext = many ? 's' : '';

    var command = "";
    if (strategy === "name") {
      command = ["au.getElement", ext, "ByName('", selector, "'", ctx,")"].join('');
    } else if (strategy === "xpath") {
      command = ["au.getElement", ext, "ByXpath('", selector, "'", ctx, ")"].join('');
    } else {
      command = ["au.getElement", ext, "ByType('", selector, "'", ctx,")"].join('');
    }

    me.proxy(command, function(err, res) {
      me.handleFindCb(err, res, many, findCb);
    });
  };
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
  var doFind = _.bind(function(findCb) {
    this.proxy(['au.mainApp.getNameContains("', name, '")'].join(''), function(err, res) {
      if (err || res.status !== 0) {
        findCb(false, err, res);
      } else {
        findCb(true, err, res);
      }
    });
  }, this);
  this.waitForCondition(this.implicitWaitMs, doFind, cb);
};

IOS.prototype.findWebElementOrElements = function(strategy, selector, ctx, many, cb) {
  var ext = many ? 's' : '';
  var atomsElement = this.getAtomsElement(ctx);
  var me = this;
  var doFind = function(findCb) {
    me.executeAtom('find_element' + ext, [strategy, selector, atomsElement], function(err, res) {
      me.handleFindCb(err, res, many, findCb);
    });
  };
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
  var me = this
    , stratMap = {'name': 'Name', 'xpath': 'Xpath', 'tag name': 'Type'}
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
    me.proxy(cmd, function(err, res) {
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
  };
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
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('click', [atomsElement], _.bind(function(err, res) {
        if (err) {
          cb(err, res);
        } else {
          this.executeAtom('type', [atomsElement, value], cb);
        }
      }, this));
    }, this));
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
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('tap', [atomsElement], cb);
    }, this));
  } else {
  if (this.useRobot) {
    var locCmd = "au.getElement('" + elementId + "').rect()";
    this.proxy(locCmd, _.bind(function(err, res) {
      if (err) return cb(err, res);
      var rect = res.value;
      var pos = {x: rect.origin.x, y: rect.origin.y};
      var size = {w: rect.size.width, h: rect.size.height};
      var tapPoint = { x: pos.x + (size.w/2), y: pos.y + (size.h/2) };
      var tapUrl = this.robotUrl + "/tap/x/" + tapPoint.x + "/y/" + tapPoint.y;
      request.get(tapUrl, {}, cb);
    }, this));
  } else {
      var command = ["au.tapById('", elementId, "')"].join('');
      this.proxy(command, cb);
    }
  }
};

IOS.prototype.touchLongClick = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.fireEvent = function(evt, elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('fireEvent', [evt, atomsElement], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.executeAtom = function(atom, args, cb, alwaysDefaultFrame) {
  var counter = this.executedAtomsCounter++;
  var frames = alwaysDefaultFrame === true ? [] : this.curWebFrames;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.remote.executeAtom(atom, args, frames, _.bind(function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }, this));
  this.lookForAlert(cb, counter, 0, 5000);
};

IOS.prototype.executeAtomAsync = function(atom, args, responseUrl, cb) {
  var counter = this.executedAtomsCounter++;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.asyncResponseCb = cb;
  this.remote.executeAtomAsync(atom, args, this.curWebFrames, responseUrl, _.bind(function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }, this));
  this.lookForAlert(cb, counter, 0, 5000);
};

IOS.prototype.receiveAsyncResponse = function(asyncResponse) {
  var asyncCb = this.asyncResponseCb
    , me = this;
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
  var me = this;
  setTimeout(function(){
    if (typeof looks === 'undefined') {
      looks = 0;
    }
    if (me.instruments !== null) {
      if (!me.returnedFromExecuteAtom[counter] && looks < 11 && !me.selectingNewPage) {
        logger.info("atom did not return yet, checking to see if " +
          "we are blocked by an alert");
        // temporarily act like we're not processing a remote command
        // so we can proxy the alert detection functionality
        me.alertCounter++;
        me.proxy("au.alertIsPresent()", function(err, res) {
          if (res !== null) {
            if (res.value === true) {
              logger.info("Found an alert, returning control to client");
              me.returnedFromExecuteAtom[counter] = true;
              cb(null, {
                status: status.codes.Success.code
                , value: ''
              });
            } else {
              // say we're processing remote cmd again
              looks++;
              setTimeout(me.lookForAlert(cb, counter, looks), 1000);
            }
          }
        });
      }
    }
  }, timeout);
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
    , me = this
    , webviewIndex = this.curWindowHandle - 1
    , wvCmd = "au.getElementsByType('webview')";

  //console.log(coords);
  // absolutize web coords
  this.proxy(wvCmd, function(err, res) {
    if (err) return cb(err, res);
    //console.log(res);
    if (typeof res.value[webviewIndex] === "undefined") {
      return cb(null, {
        status: status.codes.UnknownError.code
        , value: "Could not find webview at index " + webviewIndex
      });
    }
    var realDims, wvDims, wvPos;
    var step1 = function() {
      //console.log("getting webview real dims");
      var wvId = res.value[webviewIndex].ELEMENT;
      var locCmd = "au.getElement('" + wvId + "').rect()";
      me.proxy(locCmd, function(err, res) {
        if (err) return cb(err, res);
        var rect = res.value;
        //console.log(rect);
        wvPos = {x: rect.origin.x, y: rect.origin.y};
        realDims = {w: rect.size.width, h: rect.size.height};
        next();
      });
    };
    var step2 = function() {
      //console.log("getting browser dims");
      var cmd = "(function() { return {w: document.width, h: document.height}; })()";
      me.remote.execute(cmd, function(err, res) {
        //console.log(res.result.value);
        wvDims = {w: res.result.value.w, h: res.result.value.h};
        next();
      });
    };
    var next = function() {
      if (wvDims && realDims && wvPos) {
        var xRatio = realDims.w / wvDims.w;
        var yRatio = realDims.h / wvDims.h;
        var serviceBarHeight = 20;
        coords = {
          x: wvPos.x + (xRatio * coords.x)
          , y: wvPos.y + (yRatio * coords.y) - serviceBarHeight
        };
        //console.log("converted dims: ");
        //console.log(coords);
        me.clickCoords(coords, cb);
      }
    };
    step1();
    step2();
  });
};

IOS.prototype.submit = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('submit', [atomsElement], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.keyevent = function(keycode, cb) {
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
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('clear', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').setValue('')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getText = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('get_text', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').text()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getName = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      var script = "return arguments[0].tagName.toLowerCase()";
      this.executeAtom('execute_script', [script, [atomsElement]], cb);
    }, this));
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
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('get_top_left_coordinates', [atomsElement], cb);
    }, this));
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
      null, false, _.bind(function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var cmd = "au.getElement(" + res.value.ELEMENT + ").tap()";
      this.remote.willNavigateWithoutReload = true;
      this.proxy(cmd, cb);
    }
  }, this));
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
    this.active(_.bind(function(err, res) {
      if (err || typeof res.value.ELEMENT === "undefined") {
        return cb(err, res);
      }
      this.setValue(res.value.ELEMENT, keys, cb);
    }, this));
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
        this.useAtomsElement(frame.ELEMENT, cb, _.bind(function(atomsElement) {
          this.executeAtom('get_frame_window', [atomsElement], _.bind(function(err, res) {
            if (this.checkSuccess(err, res, cb)) {
              logger.info("Entering new web frame: " + res.value.WINDOW);
              this.curWebFrames.unshift(res.value.WINDOW);
              cb(err, res);
            }
          }, this));
        }, this));
      } else {
        atom = "frame_by_id_or_name";
        if (typeof frame === "number") {
          atom = "frame_by_index";
        }
        this.executeAtom(atom, [frame], _.bind(function(err, res) {
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
        }, this));
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
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('is_displayed', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isDisplayed()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('is_enabled', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() === 1"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementSelected = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('is_selected', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isSelected()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getCssProperty = function(elementId, propertyName, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('get_value_of_css_property', [atomsElement,
        propertyName], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.getPageSource = function(cb) {
  if (this.curWindowHandle) {
    this.processingRemoteCmd = true;
    var cmd = 'document.getElementsByTagName("html")[0].outerHTML';
    this.remote.execute(cmd, _.bind(function (err, res) {
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
    }, this));
  } else {
    this.proxy("wd_frame.getPageSource()", cb);
  }
};

IOS.prototype.getPageSourceXML = IOS.prototype.getPageSource;

IOS.prototype.waitForPageLoad = function(cb) {
  this.proxy("au.waitForPageLoad()", cb);
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
  this.proxy(command, _.bind(function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      this.curOrientation = orientation;
      cb(err, res);
    }
  }, this));
};

IOS.prototype.getScreenshot = function(cb) {
  var guid = uuid.create();
  var me = this;
  var command = ["au.capture('screenshot", guid ,"')"].join('');

  var shotPath = ["/tmp/", this.instruments.guid, "/Run 1/screenshot", guid, ".png"].join("");
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
        if (me.curOrientation === "LANDSCAPE") {
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
      };
      read(onErr);
    }
  });
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
    this.remote.navToUrl(url, _.bind(function() {
      cb(null, {
        status: status.codes.Success.code
        , value: ''
      });
      this.processingRemoteCmd = false;
    }, this));
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
    this.remote.execute('window.location.href', _.bind(function (err, res) {
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
    }, this));
  }
};

IOS.prototype.active = function(cb) {
  if (this.curWindowHandle) {
    var me = this;
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
  var me = this;
  this.listWebFrames(function(pageArray) {
    me.windowHandleCache = _.map(pageArray, me.massagePage);
    cb(null, {
      status: status.codes.Success.code
      , value: _.pluck(me.windowHandleCache, 'id')
    });
  });
};

IOS.prototype.setWindow = function(name, cb) {
  var me = this;
  if (_.contains(_.pluck(this.windowHandleCache, 'id'), name)) {
    var pageIdKey = parseInt(name, 10);
    var next = function() {
      me.processingRemoteCmd = true;
      if(me.udid === null) {
        me.remote.selectPage(pageIdKey, function() {
          me.curWindowHandle = pageIdKey.toString();
          cb(null, {
            status: status.codes.Success.code
            , value: ''
          });
          me.processingRemoteCmd = false;
        });
      } else {
        if (name == me.curWindowHandle){
          logger.info("Remote debugger is already connected to window [" + name + "]");
          cb(null, {
            status: status.codes.Success.code
            , value: name
          });
        } else if (_.contains(_.pluck(me.windowHandleCache, 'id'), name)) {
          me.remote.disconnect();
          me.curWindowHandle = name;
          me.remote.connect(name, function(){
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
    };
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
  var me = this;

  me.findAndAct('name', 'Pages', 0, 'value', [], function(err, res) {
    if (me.checkSuccess(err, res, cb)) {
      if (res.value === "") {
        cb(err, res);
      } else {
        me.findAndAct('name', 'Pages', 0, 'tap', [], function(err, res) {
          if (me.checkSuccess(err, res, cb)) {
            me.findAndAct('tag name', 'pageIndicator', 0, 'selectPage', [windowId], function(err, res) {
              if (me.checkSuccess(err, res, cb)) {
                me.findAndAct('name', 'Done', 0, 'tap', [], cb);
              }
            });
          }
        });
      }
    }
  });
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
    var me = this;
    this.convertElementForAtoms(args, function(err, res) {
      if (err) {
        cb(null, res);
      } else {
        me.executeAtom('execute_script', [script, res], cb);
      }
    });
  }
};

IOS.prototype.executeAsync = function(script, args, responseUrl, cb) {
  if (this.curWindowHandle === null) {
    this.proxy(script, cb);
  } else {
    var me = this;
    this.convertElementForAtoms(args, function(err, res) {
      if (err) {
        cb(null, res);
      } else {
        me.executeAtomAsync('execute_async_script', [script, args, me.asyncWaitMs], responseUrl, cb);
      }
    });
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
  this.getLocation(element, _.bind(function(err, res) {
    if (err) return cb(err, res);
    var coords = {
      x: res.value.x + xoffset
      , y: res.value.y + yoffset
    };
    //console.log("moving mouse to coords:");
    //console.log(coords);
    if (this.curWindowHandle) {
      this.curWebCoords = coords;
      this.useAtomsElement(element, cb, _.bind(function(atomsElement) {
        var relCoords = {x: xoffset, y: yoffset};
        this.executeAtom('move_mouse', [atomsElement, relCoords], cb);
      }, this));
    } else {
      this.curCoords = coords;
      cb(null, {
        status: status.codes.Success.code
        , value: null
      });
    }
  }, this));
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
  this.executeAtom('execute_script', [script, []], _.bind(function(err, res) {
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
  }, this), true);

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
  this.executeAtom('execute_script', [script, []], _.bind(function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      cb(null, {
        status: status.codes.Success.code
        , value: true
      });
    }
  }, this), true);
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
  this.getCookies(_.bind(function(err, res) {
    if (this.checkSuccess(err, res)) {
      var numCookies = res.value.length;
      var cookies = res.value;
      if (numCookies) {
        var returned = false;
        var deleteNextCookie = _.bind(function(cookieIndex) {
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
        }, this);
        deleteNextCookie(0);
      } else {
        cb(null, {
          status: status.codes.Success.code
          , value: false
        });
      }
    }
  }, this));
};

IOS.prototype.getCurrentActivity= function(cb) {
  cb(new NotYetImplementedError(), null);
};

IOS.prototype.isAppInstalled = function(bundleId, cb) {
  var isInstalledCommand = 'build/fruitstrap/fruitstrap isInstalled --id ' + this.udid + ' --bundle ' + bundleId;
  deviceCommon.isAppInstalled(isInstalledCommand, cb);
};

IOS.prototype.removeApp = function(bundleId, cb) {
  var removeCommand = 'build/fruitstrap/fruitstrap uninstall --id ' + this.udid + ' --bundle ' + bundleId;
  deviceCommon.removeApp(removeCommand, this.udid, bundleId, cb);
};

IOS.prototype.installApp = function(unzippedAppPath, cb) {
  var installationCommand = 'build/fruitstrap/fruitstrap install --id ' + this.udid + ' --bundle ' + unzippedAppPath;
  deviceCommon.installApp(installationCommand, this.udid, unzippedAppPath, cb);
};

IOS.prototype.unpackApp = function(req, cb) {
  deviceCommon.unpackApp(req, '.app', cb);
};

module.exports = function(args) {
  return new IOS(args);
};
