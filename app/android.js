"use strict";

var errors = require('./errors')
  , adb = require('../android/adb')
  , _ = require('underscore')
  , logger = require('../logger').get('appium')
  , deviceCommon = require('./device')
  , status = require("./uiauto/lib/status")
  //, NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError
  , parseXpath = require('./uiauto/appium/xpath').parseXpath
  , exec = require('child_process').exec
  , fs = require('fs')
  , os = require('os')
  , temp = require('temp')
  , async = require('async')
  , path = require('path')
  , UnknownError = errors.UnknownError
  , helpers = require('./helpers')
  , isWindows = helpers.isWindows();

var Android = function(opts) {
  this.initialize(opts);
};

Android.prototype.initialize = function(opts) {
  this.rest = opts.rest;
  this.webSocket = opts.webSocket;
  this.opts = opts;
  this.apkPath = opts.apkPath;
  this.udid = opts.udid;
  this.appPackage = opts.appPackage;
  this.appActivity = opts.appActivity;
  this.appWaitActivity = opts.appWaitActivity;
  this.avdName = opts.avdName;
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
  this.remote = null;
  this.webElementIds = [];
  this.curWindowHandle = null;
  this.capabilities = {
    platform: 'LINUX'
    , browserName: 'Android'
    , version: '4.1'
    , webStorageEnabled: false
    , takesScreenshot: true
    , javascriptEnabled: true
    , databaseEnabled: false
  };
};

Android.prototype.inWebView = function() {
  return this.curWindowHandle !== null;
};

// Clear data, close app, then start app.
Android.prototype.fastReset = function(cb) {
  var me = this;
  async.series([
    function(cb) { me.adb.runFastReset(cb); },
    function(cb) { me.adb.waitForNotActivity(cb); },
    function(cb) { me.adb.startApp(cb); },
  ], cb);
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

  var onLaunch = _.bind(function(err, launchCb) {
    if (typeof launchCb === "undefined" || launchCb === null) {
      launchCb = cb;
    }
    var relaunchOn = [
      'Could not find a connected Android device'
      , 'Device did not become ready'
    ];
    var checkShouldRelaunch = function(msg) {
      var relaunch = false;
      _.each(relaunchOn, function(relaunchMsg) {
        relaunch = relaunch || msg.indexOf(relaunchMsg) !== -1;
      });
      return relaunch;
    };

    if (err) {
      // This message is from adb.js. Must update when adb.js changes.
      if (err.message === null ||
          typeof err.message === 'undefined' ||
          checkShouldRelaunch(err.message.toString())) {
        logger.error(err);
        logger.error("Above error isn't fatal, maybe relaunching adb will help....");
        this.adb.waitForDevice(function(err) {
          if (err) return launchCb(err);
          didLaunch = true;
          launchCb();
        });
      } else {
        // error is already printed by ADB.prototype.waitForActivity
        this.adb = null;
        this.onStop = null;
        launchCb(err);
      }
    } else {
      logger.info("ADB launched! Ready for commands (will time out in " +
                  (this.commandTimeoutMs / 1000) + "secs)");
      this.resetTimeout();
      didLaunch = true;
      launchCb(null);
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
    this.startAppium(onLaunch, onExit);
  } else {
    logger.error("Tried to start ADB when we already have one running!");
  }
};

Android.prototype.startAppium = function(onLaunch, onExit) {
  this.adb.startAppium(onLaunch, onExit);
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
      this.shutdown();
    }, this));
    this.queue = [];
    this.progress = 0;
  }
};

Android.prototype.shutdown = function() {
  this.adb.sendShutdownCommand(_.bind(function() {
    logger.info("Sent shutdown command, waiting for ADB to stop...");
  }, this));
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

Android.prototype.push = function(elem) {
  this.resetTimeout();

  this.queue.push(elem);

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

Android.prototype.executeAtom = function(atom, args, cb, alwaysDefaultFrame) {
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
};

Android.prototype.parseExecuteResponse = deviceCommon.parseExecuteResponse;
Android.prototype.parseElementResponse = deviceCommon.parseElementResponse;
Android.prototype.useAtomsElement = deviceCommon.useAtomsElement;

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
  if (this.inWebView()) {
    this.findWebElementOrElements(strategy, selector, false, "", cb);
  } else {
    this.findUIElementOrElements(strategy, selector, false, "", cb);
  }
};

Android.prototype.findElements = function(strategy, selector, cb) {
  if (this.inWebView()) {
    this.findWebElementOrElements(strategy, selector, true, "", cb);
  } else {
    this.findUIElementOrElements(strategy, selector, true, "", cb);
  }
};

Android.prototype.findWebElementOrElements = function(strategy, selector, many, ctx, cb) {
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

Android.prototype.getAtomsElement = deviceCommon.getAtomsElement;

Android.prototype.findUIElementOrElements = function(strategy, selector, many, context, cb) {
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
    this.proxy(["find", params], _.bind(function(err, res) {
      this.handleFindCb(err, res, many, findCb);
    }, this));
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

Android.prototype.handleFindCb = function(err, res, many, findCb) {
  if (err) {
    findCb(false, err, res);
  } else {
    if (!many && res.status === 0 && res.value !== null) {
      findCb(true, err, res);
    } else if (many && typeof res.value !== 'undefined' && res.value.length > 0) {
      findCb(true, err, res);
    } else {
      findCb(false, err, res);
    }
  }
};

Android.prototype.findElementFromElement = function(element, strategy, selector, cb) {
  if (this.inWebView()) {
    this.findWebElementOrElements(strategy, selector, false, element, cb);
  } else {
    this.findUIElementOrElements(strategy, selector, false, element, cb);
  }
};

Android.prototype.findElementsFromElement = function(element, strategy, selector, cb) {
  if (this.inWebView()) {
    this.findWebElementOrElements(strategy, selector, true, element, cb);
  } else {
    this.findUIElementOrElements(strategy, selector, true, element, cb);
  }
};

Android.prototype.setValueImmediate = function(elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.findElementNameContains = function(name, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.setValue = function(elementId, value, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: value}], cb);
};

Android.prototype.click = function(elementId, cb) {
  if (this.inWebView()) {
    this.useAtomsElement(elementId, cb, _.bind(function(atomsElement) {
      this.executeAtom('tap', [atomsElement], cb);
    }, this));
  } else {
    this.proxy(["element:click", {elementId: elementId}], cb);
  }
};

Android.prototype.touchLongClick = function(elementId, cb) {
  this.proxy(["element:touchLongClick", {elementId: elementId}], cb);
};

Android.prototype.fireEvent = function(evt, elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
  this.proxy(["click", {x: x, y: y}], cb);
};

Android.prototype.clear = function(elementId, cb) {
  this.proxy(["element:clear", {elementId: elementId}], cb);
};

Android.prototype.submit = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.getName = function(elementId, cb) {
  this.proxy(["element:getName", {elementId: elementId}], cb);
};

Android.prototype.getText = function(elementId, cb) {
  this.proxy(["element:getText", {elementId: elementId}], cb);
};

Android.prototype.getAttribute = function(elementId, attributeName, cb) {
  var p = {elementId: elementId, attribute: attributeName};
  this.proxy(["element:getAttribute", p], cb);
};

Android.prototype.getLocation = function(elementId, cb) {
  this.proxy(["element:getLocation", {elementId: elementId}], cb);
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
  var xmlFile = temp.path({suffix: '.xml'});
  var jsonFile = xmlFile + '.json';
  var json = '';
  async.series(
        [
          function(cb) {
            var cmd = me.adb.adbCmd + ' shell uiautomator dump /data/local/tmp/dump.xml';
            logger.debug('getPageSource command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            var cmd = me.adb.adbCmd + ' pull /data/local/tmp/dump.xml "' + xmlFile + '"';
            logger.debug('transferPageSource command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            var jar = path.resolve(__dirname, '../app/android/dump2json.jar');
            var cmd = 'java -jar "' + jar + '" "' + xmlFile + '"';
            logger.debug('json command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            json = fs.readFileSync(jsonFile, 'utf8');
            fs.unlinkSync(jsonFile);
            fs.unlinkSync(xmlFile);
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
  var xmlFile = temp.path({suffix: '.xml'});
  async.series(
        [
          function(cb) {
            var cmd = me.adb.adbCmd + ' shell uiautomator dump /data/local/tmp/dump.xml';
            logger.debug('getPageSourceXML command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          },
          function(cb) {
            var cmd = me.adb.adbCmd + ' pull /data/local/tmp/dump.xml "' + xmlFile + '"';
            logger.debug('transferPageSourceXML command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
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
          fs.unlinkSync(xmlFile);
          cb(null, {
               status: status.codes.Success.code
               , value: xml
             });
        });
};

Android.prototype.waitForPageLoad = function(cb) {
  this.proxy(["waitForIdle", {}], cb);
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

Android.prototype.lock = function(secs, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.background = function(secs, cb) {
    cb(new NotYetImplementedError(), null);
};

Android.prototype.getOrientation = function(cb) {
  this.proxy(["orientation", {}], cb);
};

Android.prototype.setOrientation = function(orientation, cb) {
  this.proxy(["orientation", {orientation: orientation}], cb);
};

Android.prototype.getScreenshot = function(cb) {
  var me = this;
  me.adb.requireDeviceId();
  var localfile = temp.path({prefix: 'appium', suffix: '.png'});
  var b64data = "";
  var jar = path.resolve(__dirname, '..', 'app', 'android', 'ScreenShooter.jar');
  var jarpath = path.resolve(process.env.ANDROID_HOME, "tools", "lib");
  var classpath = "";

  async.series([
    function(cb) {
      if (isWindows) {
        classpath = path.resolve(jarpath, "ddmlib.jar") + ";" + path.resolve(jarpath, "x86", "swt.jar") + ";" + jar;
        cb(null);
      } else {
        exec('uname -m', { maxBuffer: 524288 }, function (error, stdout, stderr) {
          if (error) {
            cb(error);
          } else {
            classpath = path.resolve(jarpath, "ddmlib.jar") + ":" + path.resolve(jarpath, stdout.trim(), "swt.jar") + ":" + jar;
            cb(null);
          }
        });
      }
    },
    function(cb) {
      var javaCmd = 'java -classpath "' + classpath + '" io.appium.android.screenshooter.ScreenShooter ';

      var cmd = javaCmd + me.adb.curDeviceId + ' "' + localfile + '"';
      logger.debug("screenshot cmd: " + cmd);
      exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
        if (err) {
          logger.warn(stderr);
          return cb(err);
        }
        cb(null);
      });
    },
    function(cb) {
      fs.readFile(localfile, function read(err, data) {
        if (err) {
          cb(err);
        } else {
          b64data = new Buffer(data).toString('base64');
          cb(null);
        }
      });
    },
    function(cb) {
      fs.unlink(localfile, function(err) {
        if (err) {
          cb(err);
        } else {
          cb(null);
        }
      });
    }
  ],
  // Top level cb
  function(){
    cb(null, {
      status: status.codes.Success.code
      , value: b64data
    });
  });
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
  var swipeCb = function(err, res) {
    setTimeout(function() {
      cb(err, res);
    }, duration * 1000);
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], swipeCb);
  } else {
    this.proxy(["swipe", swipeOpts], swipeCb);
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
    , steps: 20
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], cb);
  } else {
    this.proxy(["swipe", swipeOpts], cb);
  }
};

Android.prototype.scrollTo = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.shake = function(cb) {
  cb(new NotYetImplementedError(), null);
};

Android.prototype.setLocation = function(latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
  var cmd = "geo fix " + longitude + " " + latitude;
  this.adb.sendTelnetCommand(cmd, function(err, res) {
    if (err) {
      return cb(null, {
        status: status.codes.UnknownError.code
        , value: "Could not set geolocation via telnet to device"
      });
    }
    cb(null, {
      status: status.codes.Success.code
      , value: res
    });
  });
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
  if (this.inWebView()) {
    var me = this;
    this.convertElementForAtoms(args, function(err, res) {
      if (err) return cb(null, res);
      me.executeAtom('execute_script', [script, res], cb);
    });
  } else {
    cb(new NotYetImplementedError(), null);
  }
};

Android.prototype.convertElementForAtoms = deviceCommon.convertElementForAtoms;

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

Android.prototype.getCurrentActivity = function(cb) {
  this.adb.getFocusedPackageAndActivity(function(err, curPackage, activity) {
    if (err) {
      return cb(null, {
        status: status.codes.UnknownError.code
        , value: err.message
      });
    }
    cb(null, {
      status: status.codes.Success.code
      , value: activity
    });
  });
};

Android.prototype.isAppInstalled = function(appPackage, cb) {
  var isInstalledCommand = null;
  if (this.udid) {
    isInstalledCommand = 'adb -s ' + this.udid + ' shell pm path ' + appPackage;
  } else if (this.avdName) {
    isInstalledCommand = 'adb -e shell pm path ' + appPackage;
  }
  deviceCommon.isAppInstalled(isInstalledCommand, cb);
};

Android.prototype.removeApp = function(appPackage, cb) {
  var removeCommand = null;
  if (this.udid) {
    removeCommand = 'adb -s ' + this.udid + ' uninstall ' + appPackage;
  } else if (this.avdName) {
    removeCommand = 'adb -e uninstall ' + appPackage;
  }
  deviceCommon.removeApp(removeCommand, this.udid, appPackage, cb);
};

Android.prototype.installApp = function(appPackage, cb) {
  var installationCommand = null;
  if (this.udid) {
    installationCommand = 'adb -s ' + this.udid + ' install ' + appPackage;
  } else if (this.avdName) {
    installationCommand = 'adb -s ' + this.avdName + ' install ' + appPackage;
  }
  deviceCommon.installApp(installationCommand, this.udid, appPackage, cb);
};

Android.prototype.unpackApp = function(req, cb) {
  deviceCommon.unpackApp(req, '.apk', cb);
};

module.exports = function(opts) {
  return new Android(opts);
};

module.exports.Android = Android;
