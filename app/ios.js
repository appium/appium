"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , instruments = require('../instruments/instruments')
  , delay = require("./helpers.js").delay
  , uuid = require('uuid-js')
  , status = require("./uiauto/lib/status");

var UnknownError = function(message) {
   this.message = message? message : "Invalid response from device";
   this.name = "UnknownError";
};

var ProtocolError = function(message) {
   this.message = message;
   this.name = "ProtocolError";
};

var IOS = function(rest, app, udid, verbose, removeTraceDir) {
  this.rest = rest;
  this.app = app;
  this.udid = udid;
  this.verbose = verbose;
  this.instruments = null;
  this.queue = [];
  this.progress = 0;
  this.removeTraceDir = removeTraceDir;
  this.onStop = function(code, traceDir) {};
  this.cbForCurrentCmd = null;
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
    cb(null);
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

IOS.prototype.stop = function(cb) {
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

IOS.prototype.findElementOrElements = function(selector, ctx, many, cb) {
  var ext = many ? 's' : '';
  if (typeof ctx === "undefined" || !ctx) {
    ctx = '';
  } else if (typeof ctx === "string") {
    ctx = ", '" + ctx + "'";
  }

  var command = ["au.getElement", ext, "ByType('", selector, "'", ctx,")"].join('');

  this.proxy(command, cb);
};

IOS.prototype.findElement = function(strategy, selector, cb) {
  if (strategy === "name") {
    var command = ['au.getElementByName("', selector, '")'].join('');
    this.proxy(command, cb);
  } else {
    this.findElementOrElements(selector, null, false, cb);
  }
};

IOS.prototype.findElements = function(strategy, selector, cb) {
  this.findElementOrElements(selector, null, true, cb);
};

IOS.prototype.findElementFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(selector, element, false, cb);
};

IOS.prototype.findElementsFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(selector, element, true, cb);
};

IOS.prototype.setValue = function(elementId, value, cb) {
  var command = ["au.getElement('", elementId, "').setValue('", value, "')"].join('');

  this.proxy(command, cb);
};

IOS.prototype.click = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').tap()"].join('');

  this.proxy(command, cb);
};

IOS.prototype.clear = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').setValue('')"].join('');

  this.proxy(command, cb);
};

IOS.prototype.getText = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').value()"].join('');

  this.proxy(command, cb);
};

IOS.prototype.getAttribute = function(elementId, attributeName, cb) {
  var command = ["au.getElement('", elementId, "').", attributeName, "()"].join('');

  this.proxy(command, cb);
};

IOS.prototype.getLocation = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').getElementLocation()"].join('');

  this.proxy(command, cb);
};

IOS.prototype.getSize = function(elementId, cb) {
  var command = ["au.getElement('", elementId, "').getElementSize()"].join('');

  this.proxy(command, cb);
};

IOS.prototype.keys = function(elementId, keys, cb) {
  var command = ["sendKeysToActiveElement('", keys ,"')"].join('');

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
  this.proxy("wd_frame.getPageSource()", cb);
};

IOS.prototype.getAlertText = function(cb) {
  this.proxy("getAlertText()", cb);
};

IOS.prototype.postAcceptAlert = function(cb) {
  this.proxy("acceptAlert()", cb);
};

IOS.prototype.postDismissAlert = function(cb) {
  this.proxy("dismissAlert()", cb);
};

IOS.prototype.getOrientation = function(cb) {
  var command = "getScreenOrientation()";

  this.proxy(command, cb);
};

IOS.prototype.setOrientation = function(orientation, cb) {
  var command = ["setScreenOrientation('", orientation ,"')"].join('');

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
        delay(0.2);
        if (delayTimes <= 10) {
          read(onErr);
        } else {
          read();
        }
      };
      var read = function(onErr) {
        fs.readFile(shotPath, function read(err, data) {
          if (err) {
            if (onErr) {
              onErr();
            } else {
              response.value = '';
              response.status = status.codes.UnknownError.code;
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

IOS.prototype.flick = function(xSpeed, ySpeed, swipe, cb) {
  var command = "";
  if (swipe) {
    command = ["touchSwipeFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }
  else {
    command = ["touchFlickFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }

  this.proxy(command, cb);
};

IOS.prototype.flickElement = function(elementId, xoffset, yoffset, speed, cb) {
  var command = ["au.getElement('", elementId, "').touchFlick(", xoffset, ",", yoffset, ",", speed, ")"].join('');

  this.proxy(command, cb);
};

IOS.prototype.url = function(cb) {
  // in the future, detect whether we have a UIWebView that we can use to
  // make sense of this command. For now, and otherwise, it's a no-op
  cb(null, {status: status.codes.Success.code, value: ''});
};

IOS.prototype.active = function(cb) {
  this.proxy("au.getActiveElement()", cb);
};

module.exports = function(rest, app, udid, verbose, removeTraceDir) {
  return new IOS(rest, app, udid, verbose, removeTraceDir);
};
