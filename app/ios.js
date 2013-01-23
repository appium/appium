"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , fs = require('fs')
  , logger = require('../logger').get('appium')
  , sock = '/tmp/instruments_sock'
  , instruments = require('../instruments/instruments')
  , delay = require("./uiauto/lib/delay.js")
  , uuid = require('uuid-js');

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
  this.capabilities = {
      version: '6.0'
      , webStorageEnabled: false
      , locationContextEnabled: false
      , browserName: 'iOS'
      , platform: 'MAC'
      , javascriptEnabled: true
      , databaseEnabled: false
      , takesScreenshot: false
  };
};

IOS.prototype.start = function(cb) {
  var me = this;

  var onLaunch = function() {
    logger.info('Instruments launched. Starting poll loop for new commands.');
    me.instruments.setDebug(true);
    cb(null, me);
  };

  var onExit = function(code, traceDir) {
    this.instruments = null;
    if (me.removeTraceDir && traceDir) {
      rimraf(traceDir, function() {
        me.onStop(code);
      });
    } else {
      me.onStop(code, traceDir);
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
  var me = this;
  if (cb) {
    this.onStop = cb;
  }

  this.instruments.shutdown();
  me.queue = [];
  me.progress = 0;
};

IOS.prototype.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  this.push([command, cb]);
  logger.info('Pushed command to appium work queue: ' + command);
};

IOS.prototype.push = function(elem) {
  this.queue.push(elem);
  var me = this;

  var next = function() {
    if (me.queue.length <= 0 || me.progress > 0) {
      return;
    }

    var target = me.queue.shift();
    me.progress++;

    me.instruments.sendCommand(target[0], function(result) {
      if (typeof target[1] === 'function') {
        if (typeof result === 'undefined') {
          target[1](null, null);
        } else {
          try {
            var jsonresult = JSON.parse(result);
            target[1](null, jsonresult);
          } catch (error) {
            target[1](error, result);
          }
        }
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
    ctx = 'wd_frame';
  } else {
    ctx = 'elements["' + ctx + '"]';
  }

  var command = [ctx, ".findElement", ext, "AndSetKey", ext, "('", selector, "')"].join("");

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.findElement = function(strategy, selector, cb) {
  this.findElementOrElements(selector, null, false, cb);
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
  var command = ["elements['", elementId, "'].setValue('", value, "')"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.click = function(elementId, cb) {
  var command = ["elements['", elementId, "'].tap()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.clear = function(elementId, cb) {
  var command = ["elements['", elementId, "'].setValue('')"].join('');

  this.proxy(command, function(err, json) {
    cb(null, json);
  });
};

IOS.prototype.getText = function(elementId, cb) {
  var command = ["elements['", elementId, "'].getText()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getAttribute = function(elementId, attributeName, cb) {
  var command = ["elements['", elementId, "'].", attributeName, "()"].join('');

  this.proxy(command, function(err, json) {
    cb(null, json);
  });
};

IOS.prototype.getLocation = function(elementId, cb) {
  var command = ["elements['", elementId, "'].getElementLocation()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getSize = function(elementId, cb) {
  var command = ["elements['", elementId, "'].getElementSize()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.keys = function(elementId, keys, cb) {
  var command = ["sendKeysToActiveElement('", keys ,"')"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.frame = function(frame, cb) {
  frame = frame? frame : 'mainWindow';
  var command = ["wd_frame = ", frame].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.implicitWait = function(seconds, cb) {
  var command = ["setImplicitWait('", seconds, "')"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.elementDisplayed = function(elementId, cb) {
  var command = ["elements['", elementId, "'].isDisplayed()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.elementEnabled = function(elementId, cb) {
  var command = ["elements['", elementId, "'].isEnabled()"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getPageSource = function(cb) {
  this.proxy("wd_frame.getPageSource()", function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getAlertText = function(cb) {
  this.proxy("target.frontMostApp().alert().name()", function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.postAcceptAlert = function(cb) {
  this.proxy("target.frontMostApp().alert().defaultButton().tap()", function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.postDismissAlert = function(cb) {
  this.proxy("target.frontMostApp().alert().cancelButton().tap()", function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.implicitWait = function(timeoutSeconds, cb) {
  var command = ["setImplicitWait('", timeoutSeconds ,"')"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getOrientation = function(cb) {
  var command = "getScreenOrientation()";

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.setOrientation = function(orientation, cb) {
  var command = ["setScreenOrientation('", orientation ,"')"].join('');

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.getScreenshot = function(cb) {
  var guid = uuid.create();
  var command = ["takeScreenshot('screenshot", guid ,"')"].join('');

  var shotPath = ["/tmp/", this.instruments.guid, "/Run 1/screenshot", guid, ".png"].join("");
  this.proxy(command, function(err, json) {
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
            cb(err, null);
          }
        } else {
          var b64data = new Buffer(data).toString('base64');
          cb(null, b64data);
        }
      });
    };
    read(onErr);
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

  this.proxy(command, function(err, json) {
    cb(err, json);
  });
};

IOS.prototype.active = function(cb) {
  this.proxy("wd_frame.getActiveElement()", function(err, json) {
    cb(null, json);
  });
};

module.exports = function(rest, app, udid, verbose, removeTraceDir) {
  return new IOS(rest, app, udid, verbose, removeTraceDir);
};
