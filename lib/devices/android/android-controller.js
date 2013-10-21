"use strict";

var errors = require('../../server/errors.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , status = require("../../server/status.js")
  , NotYetImplementedError = errors.NotYetImplementedError
  , parseXpath = require('../../xpath.js').parseXpath
  , exec = require('child_process').exec
  , fs = require('fs')
  , temp = require('temp')
  , async = require('async')
  , path = require('path');

var androidController = {};

androidController.keyevent = function(keycode, metastate, cb) {
  this.proxy(["pressKeyCode", {keycode: keycode, metastate: metastate}], cb);
};

androidController.findElement = function(strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, false, "", cb);
};

androidController.findElements = function(strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, true, "", cb);
};

androidController.findUIElementOrElements = function(strategy, selector, many, context, cb) {
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
  var doFind = function(findCb) {
    this.proxy(["find", params], function(err, res) {
      this.handleFindCb(err, res, many, findCb);
    }.bind(this));
  }.bind(this);
  if (!xpathError) {
    this.waitForCondition(this.implicitWaitMs, doFind, cb);
  } else {
    cb(null, {
      status: status.codes.XPathLookupError.code
      , value: "Could not parse xpath data from " + selector
    });
  }
};

androidController.handleFindCb = function(err, res, many, findCb) {
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

androidController.findElementFromElement = function(element, strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, false, element, cb);
};

androidController.findElementsFromElement = function(element, strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, true, element, cb);
};

androidController.setValueImmediate = function(elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.findElementNameContains = function(name, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setValue = function(elementId, value, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: value}], cb);
};

androidController.click = function(elementId, cb) {
  this.proxy(["element:click", {elementId: elementId}], cb);
};

androidController.touchLongClick = function(elementId, cb) {
  this.proxy(["element:touchLongClick", {elementId: elementId}], cb);
};

androidController.fireEvent = function(evt, elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getStrings = function(cb) {
  this.proxy(["getStrings"], cb);
};

androidController.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
  this.proxy(["click", {x: x, y: y}], cb);
};

androidController.clear = function(elementId, cb) {
  this.proxy(["element:clear", {elementId: elementId}], cb);
};

androidController.submit = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getName = function(elementId, cb) {
  this.proxy(["element:getName", {elementId: elementId}], cb);
};

androidController.getText = function(elementId, cb) {
  this.proxy(["element:getText", {elementId: elementId}], cb);
};

androidController.getAttribute = function(elementId, attributeName, cb) {
  var p = {elementId: elementId, attribute: attributeName};
  this.proxy(["element:getAttribute", p], cb);
};

androidController.getLocation = function(elementId, cb) {
  this.proxy(["element:getLocation", {elementId: elementId}], cb);
};

androidController.getSize = function(elementId, cb) {
  this.proxy(["element:getSize", {elementId: elementId}], cb);
};

androidController.getWindowSize = function(windowHandle, cb) {
  this.proxy(["getDeviceSize"], cb);
};

androidController.back = function(cb) {
  this.proxy(["pressBack"], cb);
};

androidController.forward = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.refresh = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getPageIndex = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.keys = function(elementId, keys, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: keys}], cb);
};

androidController.frame = function(frame, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.leaveWebView = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.implicitWait = function(ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.info("Set Android implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

androidController.asyncScriptTimeout = function(ms, cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.executeAsync = function(script, args, responseUrl, cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.elementDisplayed = function(elementId, cb) {
  var p = {elementId: elementId, attribute: "displayed"};
  this.proxy(["element:getAttribute", p], function(err, res) {
    if (err) return cb(err);
    var displayed = res.value === 'true';
    cb(null, {
      status: status.codes.Success.code
      , value: displayed
    });
  });
};

androidController.elementEnabled = function(elementId, cb) {
  var p = {elementId: elementId, attribute: "enabled"};
  this.proxy(["element:getAttribute", p], cb);
};

androidController.elementSelected = function(elementId, cb) {
  var p = {elementId: elementId, attribute: "selected"};
  this.proxy(["element:getAttribute", p], cb);
};

androidController.getCssProperty = function(elementId, propertyName, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getPageSource = function(cb) {
  var xmlFile = temp.path({suffix: '.xml'});
  var jsonFile = xmlFile + '.json';
  var json = '';
  async.series(
        [
          function(cb) {
            // /data/local/tmp/dump.xml
            this.proxy(["dumpWindowHierarchy"], cb);
          }.bind(this),
          function(cb) {
            var cmd = this.adb.adbCmd + ' pull /data/local/tmp/dump.xml "' + xmlFile + '"';
            logger.debug('transferPageSource command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          }.bind(this),
          function(cb) {
            var jar = path.resolve(__dirname, 'helpers', 'dump2json.jar');
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

androidController.getPageSourceXML = function(cb) {
  var xmlFile = temp.path({suffix: '.xml'});
  async.series(
        [
          function(cb) {
            var cmd = this.adb.adbCmd + ' shell uiautomator dump /data/local/tmp/dump.xml';
            logger.debug('getPageSourceXML command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          }.bind(this),
          function(cb) {
            var cmd = this.adb.adbCmd + ' pull /data/local/tmp/dump.xml "' + xmlFile + '"';
            logger.debug('transferPageSourceXML command: ' + cmd);
            exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
              if (err) {
                logger.warn(stderr);
                return cb(err);
              }
              cb(null);
            });
          }.bind(this)

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

androidController.waitForPageLoad = function(timeout, cb) {
  this.proxy(["waitForIdle", {timeout: timeout}], cb);
};

androidController.getAlertText = function(cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.setAlertText = function(text, cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.postAcceptAlert = function(cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.postDismissAlert = function(cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.lock = function(secs, cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.background = function(secs, cb) {
    cb(new NotYetImplementedError(), null);
};

androidController.getOrientation = function(cb) {
  this.proxy(["orientation", {}], cb);
};

androidController.setOrientation = function(orientation, cb) {
  this.proxy(["orientation", {orientation: orientation}], cb);
};

androidController.localScreenshot = function(file, cb) {
  this.adb.requireDeviceId();
  async.series([
    function(cb) {
      this.proxy(["takeScreenshot"], cb);
    }.bind(this),
    function(cb) {
      var cmd = this.adb.adbCmd + ' pull /data/local/tmp/screenshot.png "' + file + '"';
      exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
        if (err) {
          logger.warn(stderr);
          return cb(err);
        }
        cb(null);
      });
    }.bind(this),
  ],
  function(){
    cb(null, {
      status: status.codes.Success.code
    });
  });
};

androidController.getScreenshot = function(cb) {
  this.adb.requireDeviceId();
  var localfile = temp.path({prefix: 'appium', suffix: '.png'});
  var b64data = "";

  async.series([
    function(cb) {
      var png = "/data/local/tmp/screenshot.png";
      var cmd =  [this.adb.adbCmd, 'shell', '"/system/bin/rm', png + ';', '/system/bin/screencap -p', png, '"'].join(' ');
      logger.debug("getScreenshot: " + cmd);
      exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
        if (err) {
          logger.warn(stderr);
          return cb(err);
        }
        cb(null);
      });
    }.bind(this),
    function(cb) {
      if (fs.existsSync(localfile)) fs.unlinkSync(localfile);
      var cmd = this.adb.adbCmd + ' pull /data/local/tmp/screenshot.png "' + localfile + '"';
      logger.debug("getScreenshot: " + cmd);
      exec(cmd, { maxBuffer: 524288 }, function(err, stdout, stderr) {
        if (err) {
          logger.warn(stderr);
          return cb(err);
        }
        cb(null);
      });
    }.bind(this),
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
  function(err, res) {
    cb(null, {
      status: status.codes.Success.code
      , value: b64data
    });
  });
};

androidController.fakeFlick = function(xSpeed, ySpeed, swipe, cb) {
  this.proxy(["flick", {xSpeed: xSpeed, ySpeed: ySpeed}], cb);
};

androidController.fakeFlickElement = function(elementId, xoffset, yoffset, speed, cb) {
  this.proxy(["element:flick", {xoffset: xoffset, yoffset: yoffset, speed: speed, elementId: elementId}], cb);
};

androidController.swipe = function(startX, startY, endX, endY, duration, touchCount, elId, cb) {
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
    , steps: Math.round(duration * this.swipeStepsPerSec)
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], cb);
  } else {
    this.proxy(["swipe", swipeOpts], cb);
  }
};

androidController.rotate = function(x, y, radius, rotation, duration, touchCount, elId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.pinchClose = function(startX, startY, endX, endY, duration, percent, steps, elId, cb) {
  var pinchOpts = {
    direction: 'in'
    , elementId: elId
    , percent: percent
    , steps: steps
  };
  this.proxy(["element:pinch", pinchOpts], cb);
};

androidController.pinchOpen = function(startX, startY, endX, endY, duration, percent, steps, elId, cb) {
  var pinchOpts = {
    direction: 'out'
    , elementId: elId
    , percent: percent
    , steps: steps
  };
  this.proxy(["element:pinch", pinchOpts], cb);
};

androidController.flick = function(startX, startY, endX, endY, touchCount, elId, cb) {
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
    , steps: Math.round(0.2 * this.swipeStepsPerSec)
  };
  if (elId !== null) {
    swipeOpts.elementId = elId;
    this.proxy(["element:swipe", swipeOpts], cb);
  } else {
    this.proxy(["swipe", swipeOpts], cb);
  }
};

androidController.drag = function(startX, startY, endX, endY, steps, elementId, destElId, cb) {
  var dragOpts = {
    elementId: elementId
    , destElId: destElId
    , startX: startX
    , startY: startY
    , endX: endX
    , endY: endY
    , steps: steps
  };

  if (elementId !== null) {
    this.proxy(["element:drag", dragOpts], cb);
  } else {
    this.proxy(["drag", dragOpts], cb);
  }
};

androidController.scrollTo = function(elementId, text, cb) {
  // instead of the elementId as the element to be scrolled too,
  // it's the scrollable view to swipe until the uiobject that has the
  // text is found.
  var opts = {
    text: text
    , elementId: elementId
  };
  this.proxy(["element:scrollTo", opts], cb);
};

androidController.shake = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setLocation = function(latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
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

androidController.hideKeyboard = function(keyName, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.url = function(url, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.active = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getWindowHandle = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getWindowHandles = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setWindow = function(name, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.closeWindow = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.clearWebView = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.execute = function(script, args, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.convertElementForAtoms = deviceCommon.convertElementForAtoms;

androidController.title = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.moveTo = function(element, xoffset, yoffset, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.clickCurrent = function(button, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getCookies = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setCookie = function(cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.deleteCookie = function(cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.deleteCookies = function(cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getCurrentActivity = function(cb) {
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

androidController.fastReset = function(cb) {
  async.series([
    function(cb) { this.adb.stopAndClear(this.appPackage, cb); }.bind(this),
    this.adb.waitForNotActivity.bind(this),
    this.adb.startApp.bind(this)
  ], cb);
};

androidController.isAppInstalled = function(appPackage, cb) {
  var isInstalledCommand = null;
  if (this.udid) {
    isInstalledCommand = 'adb -s ' + this.udid + ' shell pm path ' + appPackage;
  } else {
    isInstalledCommand = 'adb shell pm path ' + appPackage;
  }
  deviceCommon.isAppInstalled(isInstalledCommand, cb);
};

androidController.removeApp = function(appPackage, cb) {
  var removeCommand = null;
  if (this.udid) {
    removeCommand = 'adb -s ' + this.udid + ' uninstall ' + appPackage;
  } else {
    removeCommand = 'adb uninstall ' + appPackage;
  }
  deviceCommon.removeApp(removeCommand, this.udid, appPackage, cb);
};

androidController.installApp = function(appPackage, cb) {
  var installationCommand = null;
  if (this.udid) {
    installationCommand = 'adb -s ' + this.udid + ' install ' + appPackage;
  } else {
    installationCommand = 'adb install ' + appPackage;
  }
  deviceCommon.installApp(installationCommand, this.udid, appPackage, cb);
};

androidController.getLog = deviceCommon.getLog;
androidController.getLogTypes = deviceCommon.getLogTypes;

androidController.unpackApp = function(req, cb) {
  deviceCommon.unpackApp(req, '.apk', cb);
};

module.exports = androidController;
