"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , instruments = require('../instruments/instruments')
  , uuid = require('uuid-js')
  , timeWarp = require('../warp.js').timeWarp
  , stopTimeWarp = require('../warp.js').stopTimeWarp
  , rd = require('./hybrid/ios/remote-debugger')
  , status = require("./uiauto/lib/status");

var NotImplementedError = function(message) {
   this.message = message? message : "Not implemented in this context, try " +
                                     "switching into or out of a web view";
   this.name = "NotImplementedError";
};

var UnknownError = function(message) {
   this.message = message? message : "Invalid response from device";
   this.name = "UnknownError";
};

var ProtocolError = function(message) {
   this.message = message;
   this.name = "ProtocolError";
};

var IOS = function(rest, app, udid, verbose, removeTraceDir, warp) {
  this.rest = rest;
  this.app = app;
  this.udid = udid;
  this.bundleId = null; // what we get from app on startup
  this.verbose = verbose;
  this.warp = warp;
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.removeTraceDir = removeTraceDir;
  this.onStop = function() {};
  this.cbForCurrentCmd = null;
  this.remote = null;
  this.curWindowHandle = null;
  this.windowHandleCache = [];
  this.webElementIds = [];
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
    me.proxy('au.bundleId()', function(err, bId) {
      logger.info('Bundle ID for open app is ' + bId.value);
      me.bundleId = bId.value;
      cb(null);
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
    if (me.removeTraceDir && traceDir) {
      rimraf(traceDir, function() {
        me.onStop(code);
      });
    } else {
      me.onStop(code);
    }
  };

  if (this.instruments === null) {
    if (this.warp) {
      timeWarp(50, 1000);
    }
    this.instruments = instruments(
      this.app
      , this.udid
      , path.resolve(__dirname, 'uiauto/bootstrap.js')
      , path.resolve(__dirname, 'uiauto/Automation.tracetemplate')
      , sock
      , onLaunch
      , onExit
    );
  }

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
  return {'ELEMENT': atomsId};
};

IOS.prototype.stopRemote = function() {
  if (!this.remote) {
    logger.error("We don't appear to be in a web frame");
    throw new Error("Tried to leave a web frame but weren't in one");
  } else {
    this.remote.disconnect();
    this.curWindowHandle = null;
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

IOS.prototype.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  this.push([command, cb]);
  logger.info('Pushed command to appium work queue: ' + command);
};

IOS.prototype.respond = function(response, cb) {
  if (typeof response === 'undefined') {
    cb(null, '');
  } else {
    if (typeof(response) !== "object") {
      cb(new UnknownError(), response);
    } else if (!('status' in response)) {
      cb(new ProtocolError('Status missing in response from device'), response);
    } else {
      var status = parseInt(response.status, 10);
      if (isNaN(status)) {
        cb(new ProtocolError('Invalid status in response from device'), response);
      } else {
        response.status = status;
        cb(null, response);
      }
    }
  }
};

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
  var ext = many ? 's' : '';
  if (typeof ctx === "undefined" || !ctx) {
    ctx = '';
  } else if (typeof ctx === "string") {
    ctx = ", '" + ctx + "'";
  }

  var command = "";
  if (strategy === "name") {
    command = ["au.getElement", ext, "ByName('", selector, "'", ctx,")"].join('');
  } else {
    command = ["au.getElement", ext, "ByType('", selector, "'", ctx,")"].join('');
  }

  this.proxy(command, cb);
};

IOS.prototype.findWebElementOrElements = function(strategy, selector, ctx, many, cb) {
  var ext = many ? 's' : '';

  var device = this
  , parseElementResponse = function(element) {
    var objId = element.ELEMENT
    , clientId = (5000 + device.webElementIds.length).toString();
    device.webElementIds.push(objId);
    return {ELEMENT: clientId};
  };

  this.remote.executeAtom('find_element' + ext, [strategy, selector], function(err, res) {
    var atomValue = res.value
      , atomStatus = res.status;
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

IOS.prototype.setValue = function(elementId, value, cb) {
  var command = ["au.getElement('", elementId, "').setValue('", value, "')"].join('');
  this.proxy(command, cb);
};

IOS.prototype.click = function(elementId, cb) {
  if (this.curWindowHandle) {
    var atomsElement = this.getAtomsElement(elementId);
    if (atomsElement === null) {
      cb(null, {
        status: status.codes.UnknownError.code
        , value: "Error converting element ID for using in WD atoms: " + elementId
      });
    } else {
      this.remote.executeAtom('click', [atomsElement], cb);
    }
  } else {
    var command = ["au.getElement('", elementId, "').tap()"].join('');
    this.proxy(command, cb);
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
  var command = ["au.getElement('", elementId, "').setValue('')"].join('');
  this.proxy(command, cb);
};

IOS.prototype.getText = function(elementId, cb) {
  if (this.curWindowHandle) {
    var atomsElement = this.getAtomsElement(elementId);
    if (atomsElement === null) {
      cb(null, {
        status: status.codes.UnknownError.code
        , value: "Error converting element ID for using in WD atoms: " + elementId
      });
    } else {
      this.remote.executeAtom('get_text', [atomsElement], cb);
    }
  } else {
    var command = ["au.getElement('", elementId, "').text()"].join('');
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
    if (_.contains(['label', 'name', 'value'], attributeName)) {
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
  var command = ["au.getElement('", elementId, "').getElementLocation()"].join('');
  this.proxy(command, cb);
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
  var command = ["au.getElement('", elementId, "').pageIndex()"].join('');
  this.proxy(command, cb);
};

IOS.prototype.keys = function(elementId, keys, cb) {
  var command = ["au.sendKeysToActiveElement('", keys ,"')"].join('');
  this.proxy(command, cb);
};

IOS.prototype.frame = function(frame, cb) {
  frame = frame? frame : 'mainWindow';
  var command = ["wd_frame = ", frame].join('');
  this.proxy(command, cb);
};

IOS.prototype.implicitWait = function(seconds, cb) {
  var command = ["au.timeout('", seconds, "')"].join('');
  this.proxy(command, cb);
};

IOS.prototype.elementDisplayed = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').isDisplayed()"].join('');
  this.proxy(command, cb);
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').isEnabled()"].join('');
  this.proxy(command, cb);
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

IOS.prototype.active = function(cb) {
  this.proxy("au.getActiveElement()", cb);
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

module.exports = function(rest, app, udid, verbose, removeTraceDir, warp) {
  return new IOS(rest, app, udid, verbose, removeTraceDir, warp);
};
