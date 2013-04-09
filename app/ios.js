"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , glob = require('glob')
  , bplistCreate = require('node-bplist-creator')
  , bplistParse = require('bplist-parser')
  , instruments = require('../instruments/instruments')
  , uuid = require('uuid-js')
  , helpers = require('./helpers.js')
  , escapeSpecialChars = helpers.escapeSpecialChars
  , parseWebCookies = helpers.parseWebCookies
  , rotateImage = helpers.rotateImage
  , rd = require('./hybrid/ios/remote-debugger')
  , errors = require('./errors')
  , deviceCommon = require('./device')
  , status = require("./uiauto/lib/status")
  , NotImplementedError = errors.NotImplementedError
  , UnknownError = errors.UnknownError;

var IOS = function(args) {
  this.rest = args.rest;
  this.app = args.app;
  this.bundleId = args.bundleId || null;
  this.udid = args.udid;
  this.verbose = args.verbose;
  this.autoWebview = args.autoWebview;
  this.withoutDelay = args.withoutDelay;
  this.reset = args.reset;
  this.removeTraceDir = args.removeTraceDir;
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
  this.returnedFromExecuteAtom = null;
  this.curCoords = null;
  this.curWebCoords = null;
  this.onPageChangeCb = null;
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
        navToWebview();
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
    this.cleanup(_.bind(function() {
      this.setDeviceType(_.bind(function(err) {
        if (err) {
          cb(err);
        } else {
          this.instruments = instruments(
            this.app || this.bundleId
            , this.udid
            , path.resolve(__dirname, 'uiauto/bootstrap.js')
            , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
            , sock
            , this.withoutDelay
            , onLaunch
            , onExit
          );
        }
      }, this));
    }, this));
  }

};

IOS.prototype.setDeviceType = function(cb) {
  if (this.udid) {
    logger.info("Not setting device type since we're connected to a device");
    cb(null);
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
        cb();
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
    this.remote.selectApp(this.bundleId, onDone);
  } else {
    this.remote = rd.init(exitCb);
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

IOS.prototype.getAtomsElement = function(wdId) {
  var atomsId;
  try {
    atomsId = this.webElementIds[parseInt(wdId, 10) - 5000];
  } catch(e) {
    return null;
  }
  if (typeof atomsId === "undefined") {
    return null;
  }
  return {'ELEMENT': atomsId};
};

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
    if (me.selectingNewPage && me.curWindowHandle) {
      logger.info("We're in the middle of selecting a new page, " +
                  "waiting to run next command until done");
      setTimeout(next, 500);
      return;
    } else if (me.curWindowHandle && me.processingRemoteCmd) {
      logger.info("We're in the middle of processing a remote debugger " +
                  "command, waiting to run next command until done");
      setTimeout(next, 500);
      return;
    }

    if (me.queue.length <= 0 || me.progress > 0) {
      return;
    }

    var target = me.queue.shift()
    , command = target[0]
    , cb = target[1];

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
  value = escapeSpecialChars(value);
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
    var command = ["au.getElement('", elementId, "').setValueByType('", value, "')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.useAtomsElement = function(elementId, failCb, cb) {
  if (parseInt(elementId, 10) < 5000) {
    logger.info("Element with id " + elementId + " passed in for use with " +
                "atoms, but it's out of our internal scope. Adding 5000");
    elementId = (parseInt(elementId, 10) + 5000).toString();
  }
  var atomsElement = this.getAtomsElement(elementId);
  if (atomsElement === null) {
    failCb(null, {
      status: status.codes.UnknownError.code
      , value: "Error converting element ID for using in WD atoms: " + elementId
    });
  } else {
    cb(atomsElement);
  }
};

IOS.prototype.click = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('tap', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').tap()"].join('');
    this.proxy(command, cb);
  }
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
  var frames = alwaysDefaultFrame === true ? [] : this.curWebFrames;
  this.returnedFromExecuteAtom = false;
  this.processingRemoteCmd = true;
  this.remote.executeAtom(atom, args, frames, _.bind(function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom) {
      this.returnedFromExecuteAtom = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }, this));
  setTimeout(_.bind(this.lookForAlert, this, cb), 5000);
};

IOS.prototype.executeAtomAsync = function(atom, args, responseUrl, cb) {
  this.returnedFromExecuteAtom = false;
  this.processingRemoteCmd = true;
  this.asyncResponseCb = cb;
  this.remote.executeAtomAsync(atom, args, this.curWebFrames, responseUrl, _.bind(function(err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom) {
      this.returnedFromExecuteAtom = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }, this));
  setTimeout(_.bind(this.lookForAlert, this, cb), 5000);
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

IOS.prototype.parseElementResponse = function(element) {
  var objId = element.ELEMENT
  , clientId = (5000 + this.webElementIds.length).toString();
  this.webElementIds.push(objId);
  return {ELEMENT: clientId};
};

IOS.prototype.parseExecuteResponse = function(response, cb) {
  if ((response.value !== null) && (typeof response.value !== "undefined")) {
    var wdElement = null;
    if (!_.isArray(response.value)) {
      if (typeof response.value.ELEMENT !== "undefined") {
        wdElement = response.value.ELEMENT;
        wdElement = this.parseElementResponse(response.value);
        if (wdElement === null) {
          cb(null, {
            status: status.codes.UnknownError.code
            , value: "Error converting element ID atom for using in WD: " + response.value.ELEMENT
          });
        }
        response.value = wdElement;
      }
    } else {
      var args = response.value;
      for (var i=0; i < args.length; i++) {
        wdElement = args[i];
        if ((args[i] !== null) && (typeof args[i].ELEMENT !== "undefined")) {
          wdElement = this.parseElementResponse(args[i]);
          if (wdElement === null) {
            cb(null, {
              status: status.codes.UnknownError.code
              , value: "Error converting element ID atom for using in WD: " + args[i].ELEMENT
            });
            return;
          }
        args[i] = wdElement;
        }
      }
      response.value = args;
    }
  }
  return response;
};

IOS.prototype.lookForAlert = function(cb, looks) {
  if (typeof looks === 'undefined') {
    looks = 0;
  }
  if (this.instruments !== null) {
    if (!this.returnedFromExecuteAtom && looks < 11 && !this.selectingNewPage) {
      logger.info("atom did not return yet, checking to see if " +
                  "we are blocked by an alert");
      // temporarily act like we're not processing a remote command
      // so we can proxy the alert detection functionality
      this.processingRemoteCmd = false;
      var me = this;
      this.proxy("au.alertIsPresent()", function(err, res) {
        if (res !== null) {
          if (res.value === true) {
            logger.info("Found an alert, returning control to client");
            me.returnedFromExecuteAtom = true;
            cb(null, {
              status: status.codes.Success.code
              , value: ''
            });
          } else {
            // say we're processing remote cmd again
            me.processingRemoteCmd = true;
            looks ++;
            setTimeout(_.bind(me.lookForAlert, me, [cb, looks]), 1000);
          }
        }
      });
    }
  }
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
  var opts = coords;
  opts.tapCount = 1;
  opts.duration = 0.3;
  opts.touchCount = 1;
  var command =["au.complexTap(" + JSON.stringify(opts) + ")"].join('');
  this.proxy(command, cb);
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
    cb(new NotImplementedError(), null);
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
  keys = escapeSpecialChars(keys);
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
    frame = frame? frame : 'mainWindow';
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
    var command = ["au.getElement('", elementId, "').isDisplayed() ? true : false"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('is_enabled', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() ? true : false"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementSelected = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('is_selected', [atomsElement], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
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
  this.proxy(command, cb);
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
      me.remote.selectPage(pageIdKey, function() {
        me.curWindowHandle = pageIdKey.toString();
        cb(null, {
          status: status.codes.Success.code
          , value: ''
        });
        me.processingRemoteCmd = false;
      });
    };
    //if (me.autoWebview) {
      //me.setSafariWindow(pageIdKey - 1, function(err, res) {
        //if (err) {
          //cb(err);
        //} else if (res.status !== status.codes.Success.code) {
          //cb(res.status);
        //} else {
          //next();
        //}
      //});
    //} else {
    next();
    //}
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

IOS.prototype.convertElementForAtoms = function(args, cb) {
  for (var i=0; i < args.length; i++) {
    if (args[i] !== null && typeof args[i].ELEMENT !== "undefined") {
      var atomsElement = this.getAtomsElement(args[i].ELEMENT);
      if (atomsElement === null) {
        cb(true, {
          status: status.codes.UnknownError.code
          , value: "Error converting element ID for using in WD atoms: " + args[i].ELEMENT
        });
      return;
      }
      args[i] = atomsElement;
    }
  }
  cb(null, args);
};

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

module.exports = function(args) {
  return new IOS(args);
};
