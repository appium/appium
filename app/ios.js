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
  , timeWarp = require('../warp.js').timeWarp
  , stopTimeWarp = require('../warp.js').stopTimeWarp
  , escapeSpecialChars = require('./helpers.js').escapeSpecialChars
  , rd = require('./hybrid/ios/remote-debugger')
  , errors = require('./errors')
  , deviceCommon = require('./device')
  , status = require("./uiauto/lib/status")
  , NotImplementedError = errors.NotImplementedError
  , UnknownError = errors.UnknownError;

var IOS = function(args) {
  this.rest = args.rest;
  this.app = args.app;
  this.udid = args.udid;
  this.verbose = args.verbose;
  this.autoWebview = args.autoWebview;
  this.warp = args.warp;
  this.withoutDelay = args.withoutDelay;
  this.reset = args.reset;
  this.removeTraceDir = args.removeTraceDir;
  this.deviceType = args.deviceType;
  this.bundleId = null; // what we get from app on startup
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.onStop = function() {};
  this.cbForCurrentCmd = null;
  this.remote = null;
  this.curWindowHandle = null;
  this.windowHandleCache = [];
  this.webElementIds = [];
  this.implicitWaitMs = 0;
  this.curCoords = null;
  this.curWebCoords = null;
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
    me.proxy('au.bundleId()', function(err, bId) {
      logger.info('Bundle ID for open app is ' + bId.value);
      me.bundleId = bId.value;
      navToWebview();
    });
  };

  var onExit = function(code, traceDir) {
    if (!didLaunch) {
      logger.error("Instruments did not launch successfully, failing session");
      cb("Instruments did not launch successfully--please check your app " +
          "paths or bundle IDs and try again");
      code = 1; // this counts as an error even if instruments doesn't think so
    } else if (typeof me.cbForCurrentCmd === "function") {
      // we were in the middle of waiting for a command when it died
      // so let's actually respond with something
      var error = new UnknownError("Instruments died while responding to " +
                                   "command, please check appium logs");
      me.cbForCurrentCmd(error, null);
      code = 1; // this counts as an error even if instruments doesn't think so
    }
    this.instruments = null;
    this.curCoords = null;
    try {
      this.stopRemote();
    } catch(e) {}
    var nexts = 0;
    var next = function() {
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
      if (this.warp) {
        timeWarp(50, 1000);
      }
      this.setDeviceType(_.bind(function(err) {
        if (err) {
          cb(err);
        } else {
          this.instruments = instruments(
            this.app
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

IOS.prototype.cleanupAppState = function(cb) {
  var user = process.env.USER
    , me = this;
  logger.info("Deleting plists for bundle: " + this.bundleId);
  glob("/Users/" + user + "/Library/Application Support/iPhone Simulator/**/" +
       me.bundleId + ".plist", {}, function(err, files) {
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
  var me = this;
  if (this.remote) {
    logger.error("Can't enter a web frame when we're already in one!");
    throw new Error("Tried to enter a web frame when we were in one");
  }
  if (!this.bundleId) {
    logger.error("Can't enter web frame without a bundle ID");
    throw new Error("Tried to enter web frame without a bundle ID");
  }
  this.remote = rd.init(exitCb);
  this.remote.connect(function(appDict) {
    if(!_.has(appDict, me.bundleId)) {
      logger.error("Remote debugger did not list " + me.bundleId + " among " +
                   "its available apps");
      if(_.has(appDict, "com.apple.mobilesafari")) {
        logger.info("Using mobile safari instead");
        me.remote.selectApp("com.apple.mobilesafari", cb);
      } else {
        cb([]);
      }
    } else {
      me.remote.selectApp(me.bundleId, cb);
    }
  }, function() {
    logger.error("Remote debugger crashed before we shut it down!");
    me.stopRemote();
    exitCb();
  });
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
    this.curWebCoords = null;
    this.remote = null;
  }
};

IOS.prototype.stop = function(cb) {
  if (this.warp) {
    stopTimeWarp();
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

    me.cbForCurrentCmd = cb;

    me.progress++;

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

  var me = this;
  var doFind = function(findCb) {
    me.remote.executeAtom('find_element' + ext, [strategy, selector], function(err, res) {
      me.cacheAndReturnWebEl(err, res, many, function(err, res) {
        me.handleFindCb(err, res, many, findCb);
      });
    });
  };

  this.waitForCondition(this.implicitWaitMs, doFind, cb);
};

IOS.prototype.cacheAndReturnWebEl = function(err, res, many, cb) {
  var atomValue = res.value
    , atomStatus = res.status
    , me = this;

  var parseElementResponse = function(element) {
    var objId = element.ELEMENT
    , clientId = (5000 + me.webElementIds.length).toString();
    me.webElementIds.push(objId);
    return {ELEMENT: clientId};
  };

  if (atomStatus == status.codes.Success.code) {
    if (many) {
      if (typeof atomValue == "object") {
        atomValue = _.map(atomValue, parseElementResponse);
      }
    } else {
      if (atomValue === null) {
        atomStatus = status.codes.NoSuchElement.code;
      } else {
        atomValue = parseElementResponse(atomValue);
      }
    }
  }
  cb(err, {
    status: atomStatus
    , value: atomValue
  });
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
                          "value", "name", "label", "setValue"]
    , many = index > 0;
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
      if (!err && res.value !== null) {
        findCb(true, err, res);
      } else {
        findCb(false, err, res);
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
      this.remote.executeAtom('click', [atomsElement], _.bind(function(err, res) {
        if (err) {
          cb(err, res);
        } else {
          this.remote.executeAtom('type', [atomsElement, value], cb);
        }
      }, this));
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').setValueByType('", value, "')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.useAtomsElement = function(elementId, failCb, cb) {
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
      this.remote.executeAtom('tap', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').tap()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.clickCurrent = function(button, cb) {
  //console.log("clicking current loc");
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
  //console.log("native-tapping coords");
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
      this.remote.executeAtom('submit', [atomsElement], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
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
      this.remote.executeAtom('clear', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').setValue('')"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getText = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.remote.executeAtom('get_text', [atomsElement], cb);
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
      this.remote.executeAtom('execute_script', [script, [atomsElement]], cb);
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
      this.remote.executeAtom('get_attribute_value', [atomsElement, attributeName], cb);
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
      this.remote.executeAtom('get_top_left_coordinates', [atomsElement], cb);
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
      this.remote.executeAtom('get_size', [atomsElement], cb);
    }
  } else {
    var command = ["au.getElement('", elementId, "').getElementSize()"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.getWindowSize = function(windowHandle, cb) {
  if (this.curWindowHandle) {
    cb(new NotImplementedError(), null);
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
    cb(new NotImplementedError(), null);
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

IOS.prototype.elementDisplayed = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.remote.executeAtom('is_displayed', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isDisplayed() ? true : false"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.remote.executeAtom('is_enabled', [atomsElement], cb);
    }, this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() ? true : false"].join('');
    this.proxy(command, cb);
  }
};

IOS.prototype.elementSelected = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.remote.executeAtom('is_selected', [atomsElement], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.getCssProperty = function(elementId, propertyName, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.remote.executeAtom('get_value_of_css_property', [atomsElement,
        propertyName], cb);
    }, this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

IOS.prototype.getPageSource = function(cb) {
  if (this.curWindowHandle) {
    this.remote.execute('document.getElementsByTagName("html")[0].outerHTML',
                        function (err, res) {
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
    });
  } else {
    this.proxy("wd_frame.getPageSource()", cb);
  }
};

IOS.prototype.getAlertText = function(cb) {
  this.proxy("au.getAlertText()", cb);
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
  this.proxy(command, cb);
};

IOS.prototype.getScreenshot = function(cb) {
  var guid = uuid.create();
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
    this.remote.navToUrl(url, function() {
      cb(null, {
        status: status.codes.Success.code
        , value: ''
      });
    });
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
    });
  }
};

IOS.prototype.active = function(cb) {
  if (this.curWindowHandle) {
    var me = this;
    this.remote.executeAtom('active_element', [], function(err, res) {
      me.cacheAndReturnWebEl(err, res, false, cb);
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

IOS.prototype.getWindowHandles = function(cb) {
  var me = this;
  this.listWebFrames(function(pageArray) {
    me.windowHandleCache = [];
    _.each(pageArray, function(page) {
      me.windowHandleCache.push(page.id.toString());
    });
    cb(null, {
      status: status.codes.Success.code
      , value: me.windowHandleCache
    });
  });
};

IOS.prototype.setWindow = function(name, cb) {
  var me = this;
  if (_.contains(this.windowHandleCache, name)) {
    var pageIdKey = parseInt(name, 10);
    me.remote.selectPage(pageIdKey, function() {
      me.curWindowHandle = pageIdKey;
      cb(null, {
        status: status.codes.Success.code
        , value: ''
      });
    });
  } else {
    cb(status.codes.NoSuchWindow.code, null);
  }
};

IOS.prototype.clearWebView = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
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
    for (var i=0; i < args.length; i++) {
      if (typeof args[i].ELEMENT !== "undefined") {
        var atomsElement = this.getAtomsElement(args[i].ELEMENT);
        if (atomsElement === null) {
          cb(null, {
            status: status.codes.UnknownError.code
            , value: "Error converting element ID for using in WD atoms: " + args[i].ELEMENT
          });
        return;
        }
        args[i] = atomsElement;
      }
    }
    this.remote.executeAtom('execute_script', [script, args], cb);
  }
};

IOS.prototype.title = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.remote.execute('document.title', function (err, res) {
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
    });
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
        this.remote.executeAtom('move_mouse', [atomsElement, relCoords], cb);
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

module.exports = function(args) {
  return new IOS(args);
};
