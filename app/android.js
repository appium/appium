"use strict";

var errors = require('./errors')
  , adb = require('../uiautomator/adb')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , deviceCommon = require('./device')
  , status = require("./uiauto/lib/status")
  //, NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError
  , parseXpath = require('./uiauto/appium/xpath').parseXpath
  , exec = require('child_process').exec
  , fs = require('fs')
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError;

var Android = function(opts) {
  this.rest = opts.rest;
  this.opts = opts;
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity;
  this.appDeviceReadyTimeout = opts.appDeviceReadyTimeout;
  this.verbose = opts.verbose;
  this.queue = [];
  this.progress = 0;
  this.onStop = function() {};
  this.implicitWaitMs = 0;
  this.commandTimeoutMs = 60 * 1000;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
  this.shuttingDown = false;
  this.adb = null;
  this.swipeStepsPerSec = 200;
  this.asyncWaitMs = 0;
  this.capabilities = {
    platform: 'LINUX'
    , browserName: 'Android'
    , version: '4.1'
    , webStorageEnabled: false
    , takesScreenshots: true
    , javascriptEnabled: true
    , databaseEnabled: false
  };
  this.lastCmd = null;
};

// Clear data, close app, then start app.
Android.prototype.fastReset = function(cb) {
  this.adb.runFastReset(function(err) { if (err) return cb(err); return cb(null); });
};

Android.prototype.keyevent = function(keycode, cb) {
  this.adb.keyevent(keycode, function() {
    cb(null, {
      status: status.codes.Success.code
      , value: null
    });
  });
};

Android.prototype.start = function(cb, onDie) {
  if (typeof onDie === "function") {
    this.onStop = onDie;
  }
  var didLaunch = false;

  var onLaunch = _.bind(function(err) {
    var skipRelaunchOn = [
      'App never showed up'
      , 'Could not sign one or more apks'
    ];
    var checkShouldSkipRelaunch = function(msg) {
      var skip = false;
      _.each(skipRelaunchOn, function(skipMsg) {
        skip = skip || msg.indexOf(skipMsg) !== -1;
      });
      return skip;
    };
    if (err) {
      // This message is from adb.js. Must update when adb.js changes.
      if (err.message === null ||
          typeof err.message === 'undefined' ||
          !checkShouldSkipRelaunch(err.message.toString())) {
        logger.error("Relaunching adb....");
        var me = this;
        this.adb.waitForDevice(function(){ didLaunch = true; me.push(null, true); cb(null); });
      } else {
        // error is already printed by ADB.prototype.waitForActivity
        this.adb = null;
        this.onStop = null;
        cb(err);
      }
    } else {
      logger.info("ADB launched! Ready for commands (will time out in " +
                  (this.commandTimeoutMs / 1000) + "secs)");
      this.resetTimeout();
      didLaunch = true;
      cb(null);
    }
  }, this);

  var onExit = _.bind(function(code) {
    if (!didLaunch) {
      logger.error("ADB quit before it successfully launched");
      cb("ADB quit unexpectedly before successfully launching");
      code = code || 1;
    } else if (typeof this.cbForCurrentCmd === "function") {
      var error = new UnknownError("ADB died while responding to command, " +
                                   "please check appium logs!");
      this.cbForCurrentCmd(error, null);
      code = code || 1;
    }
    this.adb.uninstallApp(_.bind(function() {
      this.adb = null;
      this.shuttingDown = false;
      this.onStop(code);
      this.onStop = null;
    }, this));
  }, this);

  if (this.adb === null) {
    // Pass Android opts and Android ref to adb.
    this.adb = adb(this.opts, this);
    this.adb.start(onLaunch, onExit);
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.timeoutWaitingForCommand = function() {
  logger.info("Didn't get a new command in " + (this.commandTimeoutMs / 1000) +
              " secs, shutting down...");
  //this.adb.sendShutdownCommand(function() {
    //logger.info("Sent shutdown command, waiting for ADB to stop...");
  //});
  this.stop();
};

Android.prototype.stop = function(cb) {
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  if (this.adb === null) {
    logger.info("Trying to stop adb but it already exited");
    if (cb) {
      cb();
    }
  } else {
    if (cb) {
      this.onStop = cb;
    }
    this.shuttingDown = true;
    this.adb.goToHome(_.bind(function() {
      this.adb.sendShutdownCommand(_.bind(function() {
        logger.info("Sent shutdown command, waiting for ADB to stop...");
      }, this));
    }, this));
    this.queue = [];
    this.progress = 0;
  }
};

Android.prototype.resetTimeout = function() {
  if (this.commandTimeout) {
    clearTimeout(this.commandTimeout);
  }
  this.commandTimeout = setTimeout(_.bind(this.timeoutWaitingForCommand, this),
      this.commandTimeoutMs);
};

Android.prototype.proxy = deviceCommon.proxy;
Android.prototype.respond = deviceCommon.respond;

Android.prototype.push = function(elem, resendLast) {
  this.resetTimeout();

  if (resendLast) {
    // We're resending the last command because the bootstrap jar disconnected.
    this.queue.push(this.lastCmd);
  } else {
    this.queue.push(elem);
  }

  var next = _.bind(function() {
    if (this.queue.length <= 0) {
      return;
    }

    if (this.queue[0] === null) {
      this.queue.shift();
      return;
    }

    // Always send the command.
    if (this.progress > 0) {
      this.progress = 0;
    }

    var target = this.queue.shift()
      , action = target[0][0]
      , params = typeof target[0][1] === "undefined" ? {} : target[0][1]
      , cb = target[1];

    if (!resendLast) {
      // Store the last command in case the bootstrap jar disconnects.
      this.lastCmd = target;
    }

    this.cbForCurrentCmd = cb;

    this.progress++;

    if (this.adb && !this.shuttingDown) {
      this.adb.sendAutomatorCommand(action, params, _.bind(function(response) {
        this.cbForCurrentCmd = null;
        if (typeof cb === 'function') {
          this.respond(response, cb);
        }

        // maybe there's moar work to do
        this.progress--;
        next();
      }, this));
    } else {
      this.cbForCurrentCmd = null;
      var msg = "Tried to send command to non-existent Android device, " +
                 "maybe it shut down?";
      if (this.shuttingDown) {
        msg = "We're in the middle of shutting down the Android device, " +
              "so your request won't be executed. Sorry!";
      }

      this.respond({
        status: status.codes.UnknownError.code
        , value: msg
      }, cb);
      this.progress--;
      next();
    }
  }, this);

  next();
};

Android.prototype.waitForCondition = deviceCommon.waitForCondition;

Android.prototype.setCommandTimeout = function(secs, cb) {
  logger.info("Setting command timeout for android to " + secs + " secs");
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeoutMs = secs * 1000;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: ''
  });
};

Android.prototype.resetCommandTimeout = function(cb) {
  this.commandTimeoutMs = this.origCommandTimeoutMs;
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: ''
  });
};

Android.prototype.getCommandTimeout = function(cb) {
  this.resetTimeout();
  cb(null, {
    status: status.codes.Success.code
    , value: this.commandTimeoutMs / 1000
  });
};

Android.prototype.findElement = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, false, "", cb);
};

Android.prototype.findElements = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, true, "", cb);
};

Android.prototype.findElementOrElements = function(strategy, selector, many, context, cb) {
  var params = {
    strategy: strategy
    , selector: selector
    , context: context
    , multiple: many
  };
  var xpathError = false;
  if (strategy === "xpath") {
    var xpathParams = parseXpath(selector);
    if (!xpathParams) {
      xpathError = true;
    } else {
      // massage for the javas
      if (xpathParams.attr === null) {
        xpathParams.attr = "";
      }
      if (xpathParams.constraint === null) {
        xpathParams.constraint = "";
      }
      params = _.extend(params, xpathParams);
    }
  }
  var doFind = _.bind(function(findCb) {
    this.proxy(["find", params], function(err, res) {
      if (err) {
        findCb(false, err, res);
      } else {
        if (!many && res.status === 0) {
          findCb(true, err, res);
        } else if (many && typeof res.value !== 'undefined' && res.value.length > 0) {
          findCb(true, err, res);
        } else {
          findCb(false, err, res);
        }
      }
    });
  }, this);
  if (!xpathError) {
    this.waitForCondition(this.implicitWaitMs, doFind, cb);
  } else {
    cb(null, {
      status: status.codes.XPathLookupError.code
      , value: "Could not parse xpath data from " + selector
    });
  }
};

Android.prototype.findElementFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, false, element, cb);
};

Android.prototype.findElementsFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, true, element, cb);
};

Android.prototype.setValueImmediate = function(elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.setValue = function(elementId, value, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: value}], cb);
};

Android.prototype.click = function(elementId, cb) {
  this.proxy(["element:click", {elementId: elementId}], cb);
};

Android.prototype.fireEvent = function(evt, elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
  this.proxy(["click", {x: x, y: y}], cb);
};

Android.prototype.clear = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.submit = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getName = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getText = function(elementId, cb) {
  this.proxy(["element:getText", {elementId: elementId}], cb);
};

Android.prototype.getAttribute = function(elementId, attributeName, cb) {
  var p = {elementId: elementId, attribute: attributeName};
  this.proxy(["element:getAttribute", p], cb);
};

Android.prototype.getLocation = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getSize = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getWindowSize = function(windowHandle, cb) {
  this.proxy(["getDeviceSize"], cb);
};

Android.prototype.back = function(cb) {
  this.adb.back(function() {
    cb(null, {
      status: status.codes.Success.code
      , value: null
    });
  });
};

Android.prototype.forward = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.refresh = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getPageIndex = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.keys = function(elementId, keys, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: keys}], cb);
};

Android.prototype.frame = function(frame, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.leaveWebView = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.implicitWait = function(ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.info("Set Android implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

Android.prototype.asyncScriptTimeout = function(ms, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.executeAsync = function(script, args, responseUrl, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.elementDisplayed = function(elementId, cb) {
  var p = {elementId: elementId, attribute: "displayed"};
  this.proxy(["element:getAttribute", p], cb);
};

Android.prototype.elementEnabled = function(elementId, cb) {
  var p = {elementId: elementId, attribute: "enabled"};
  this.proxy(["element:getAttribute", p], cb);
};

Android.prototype.elementSelected = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getCssProperty = function(elementId, propertyName, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getPageSource = function(cb) {
  var me = this;
  var xmlFile = '/tmp/dump.xml';
  var jsonFile = xmlFile + '.json';
  var json = '';
  async.series(
        [
          function(cb) {
            var cmd = me.adb.adbCmd + ' shell uiautomator dump /cache/dump.xml;';
            cmd += me.adb.adbCmd + ' pull /cache/dump.xml ' + xmlFile;
            logger.debug('getPageSource command: ' + cmd);
            exec(cmd, {}, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            var jar = path.resolve(__dirname, '../app/android/dump2json.jar');
            var cmd = 'java -jar "' + jar + '" ' + xmlFile;
            logger.debug('json command: ' + cmd);
            exec(cmd, {}, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            json = fs.readFileSync(jsonFile, 'utf8');
            cb(null);
          }
        ],
        // Top level cb
        function(){
          cb(null, {
               status: status.codes.Success.code
               , value: json
             });
        });
};

Android.prototype.getPageSourceXML = function(cb) {
  var me = this;
  var xmlFile = '/tmp/dump.xml';
  async.series(
        [
          function(cb) {
            var cmd = me.adb.adbCmd + ' shell uiautomator dump /cache/dump.xml;';
            cmd += me.adb.adbCmd + ' pull /cache/dump.xml ' + xmlFile;
            logger.debug('getPageSourceXML command: ' + cmd);
            exec(cmd, {}, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          }
        ],
        // Top level cb
        function(){
          var xml = fs.readFileSync(xmlFile, 'utf8');
          cb(null, {
               status: status.codes.Success.code
               , value: xml
             });
        });
};

Android.prototype.getAlertText = function(cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.setAlertText = function(text, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.postAcceptAlert = function(cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.postDismissAlert = function(cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.getOrientation = function(cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.setOrientation = function(orientation, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.getScreenshot = function(cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.fakeFlick = function(xSpeed, ySpeed, swipe, cb) {
  this.proxy(["flick", {xSpeed: xSpeed, ySpeed: ySpeed}], cb);
};

Android.prototype.fakeFlickElement = function(elementId, xoffset, yoffset, speed, cb) {
  this.proxy(["element:flick", {xoffset: xoffset, yoffset: yoffset, speed: speed, elementId: elementId}], cb);
};

Android.prototype.swipe = function(startX, startY, endX, endY, duration, touchCount, elId, cb) {
  if (startX === 'null') {
    startX = 0.5;
  }
  if (startY === 'null') {
    startY = 0.5;
  }
  var swipeOpts = {
    startX: startX
    , startY: startY
    , endX: endX
    , endY: endY
    , steps: Math.round((duration * 1000) / this.swipeStepsPerSec)
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], cb);
  } else {
    this.proxy(["swipe", swipeOpts], cb);
  }
};

Android.prototype.flick = function(startX, startY, endX, endY, touchCount, elId, cb) {
  if (startX === 'null') {
    startX = 0.5;
  }
  if (startY === 'null') {
    startY = 0.5;
  }
  var swipeOpts = {
    startX: startX
    , startY: startY
    , endX: endX
    , endY: endY
    , steps: 3
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], cb);
  } else {
    this.proxy(["swipe", swipeOpts], cb);
  }
};

Android.prototype.hideKeyboard = function(keyName, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.url = function(url, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.active = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getWindowHandle = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getWindowHandles = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.setWindow = function(name, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.closeWindow = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.clearWebView = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.execute = function(script, args, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.title = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.moveTo = function(element, xoffset, yoffset, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.clickCurrent = function(button, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getCookies = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.setCookie = function(cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.deleteCookie = function(cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.deleteCookies = function(cb) {
  cb(new NotYetImplementedError(), null);
};

module.exports = function(opts) {
  return new Android(opts);
};
