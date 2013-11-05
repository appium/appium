"use strict";
var uuid = require('uuid-js')
  , path = require('path')
  , fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , status = require("../../server/status.js")
  , logger = require('../../server/logger.js').get('appium')
  , helpers = require('../../helpers.js')
  , escapeSpecialChars = helpers.escapeSpecialChars
  , parseWebCookies = helpers.parseWebCookies
  , rotateImage = helpers.rotateImage
  , request = require('request')
  , mkdirp = require('mkdirp')
  , deviceCommon = require('../common.js')
  , errors = require('../../server/errors.js')
  , NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError;

var iOSController = {};

var logTypesSupported = {
  'syslog' : 'Logs for iOS applications on real device and simulators'
};

iOSController.findUIElementOrElements = function(strategy, selector, ctx, many, cb) {
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

iOSController.handleFindCb = function(err, res, many, findCb) {
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

iOSController.findElementNameContains = function(name, cb) {
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

iOSController.findWebElementOrElements = function(strategy, selector, ctx, many, cb) {
  var ext = many ? 's' : '';
  var atomsElement = this.getAtomsElement(ctx);
  var doFind = function(findCb) {
    this.executeAtom('find_element' + ext, [strategy, selector, atomsElement], function(err, res) {
      this.handleFindCb(err, res, many, findCb);
    }.bind(this));
  }.bind(this);
  this.waitForCondition(this.implicitWaitMs, doFind, cb);
};

iOSController.findElementOrElements = function(strategy, selector, ctx, many, cb) {
  if (this.curWindowHandle) {
    this.findWebElementOrElements(strategy, selector, ctx, many, cb);
  } else {
    this.findUIElementOrElements(strategy, selector, ctx, many, cb);
  }
};

iOSController.findElement = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, false, cb);
};

iOSController.findElements = function(strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, true, cb);
};

iOSController.findElementFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, false, cb);
};

iOSController.findElementsFromElement = function(element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, true, cb);
};

iOSController.findAndAct = function(strategy, selector, index, action, actionParams, cb) {
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

iOSController.setValueImmediate = function(elementId, value, cb) {
  value = escapeSpecialChars(value, "'");
  var command = ["au.getElement('", elementId, "').setValue('", value, "')"].join('');
  this.proxy(command, cb);
};

iOSController.setValue = function(elementId, value, cb) {
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

iOSController.useAtomsElement = deviceCommon.useAtomsElement;

iOSController.click = function(elementId, cb) {
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

iOSController.touchLongClick = function(elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getStrings = function(cb) {
  var strings = this.localizableStrings;
  if (strings && strings.length >= 1) strings = strings[0];

  cb(null, {
    status: status.codes.Success.code
    , value: strings
  });
};

iOSController.fireEvent = function(evt, elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('fireEvent', [evt, atomsElement], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.executeAtom = function(atom, args, cb, alwaysDefaultFrame) {
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

iOSController.executeAtomAsync = function(atom, args, responseUrl, cb) {
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

iOSController.receiveAsyncResponse = function(asyncResponse) {
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

iOSController.parseExecuteResponse = deviceCommon.parseExecuteResponse;
iOSController.parseElementResponse = deviceCommon.parseElementResponse;

iOSController.lookForAlert = function(cb, counter, looks, timeout) {
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

iOSController.clickCurrent = function(button, cb) {
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

iOSController.clickCoords = function(coords, cb) {
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

iOSController.clickWebCoords = function(cb) {
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

iOSController.submit = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('submit', [atomsElement], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.keyevent = function(keycode, metastate, cb) {
  cb(new NotImplementedError(), null);
};

iOSController.complexTap = function(tapCount, touchCount, duration, x, y, elementId, cb) {
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

iOSController.clear = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('clear', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').setValue('')"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getText = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('get_text', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').text()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getName = function(elementId, cb) {
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

iOSController.getAttribute = function(elementId, attributeName, cb) {
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

iOSController.getLocation = function(elementId, cb) {
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

iOSController.getSize = function(elementId, cb) {
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

iOSController.getWindowSize = function(windowHandle, cb) {
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

iOSController.mobileSafariNav = function(navBtnName, cb) {
  this.findUIElementOrElements('xpath', '//toolbar/button[@name="' + navBtnName + '"]',
      null, false, function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var cmd = "au.getElement(" + res.value.ELEMENT + ").tap()";
      this.remote.willNavigateWithoutReload = true;
      this.proxy(cmd, cb);
    }
  }.bind(this));
};

iOSController.back = function(cb) {
  if (this.curWindowHandle === null) {
    var command = "au.back();";
    this.proxy(command, cb);
  } else {
    this.mobileSafariNav("Back", cb);
  }
};

iOSController.forward = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.mobileSafariNav("Forward", cb);
  }
};

iOSController.refresh = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.executeAtom('refresh', [], cb);
  }
};

iOSController.getPageIndex = function(elementId, cb) {
  if (this.curWindowHandle) {
    cb(new NotImplementedError(), null);
  } else {
    var command = ["au.getElement('", elementId, "').pageIndex()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.keys = function(keys, cb) {
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

iOSController.frame = function(frame, cb) {
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

iOSController.implicitWait = function(ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.info("Set iOS implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

iOSController.asyncScriptTimeout = function(ms, cb) {
  this.asyncWaitMs = parseInt(ms, 10);
  logger.info("Set iOS async script timeout to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
    , value: null
  });
};

iOSController.elementDisplayed = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_displayed', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isDisplayed()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.elementEnabled = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_enabled', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() === 1"].join('');
    this.proxy(command, cb);
  }
};

iOSController.elementSelected = function(elementId, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('is_selected', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isSelected()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getCssProperty = function(elementId, propertyName, cb) {
  if (this.curWindowHandle) {
    this.useAtomsElement(elementId, cb, function(atomsElement) {
      this.executeAtom('get_value_of_css_property', [atomsElement,
        propertyName], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.getPageSource = function(cb) {
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

iOSController.getPageSourceXML = iOSController.getPageSource;

iOSController.waitForPageLoad = function(timeout, cb) {
  this.proxy("au.waitForPageLoad(" + timeout + ")", cb);
};

iOSController.getAlertText = function(cb) {
  this.proxy("au.getAlertText()", cb);
};

iOSController.setAlertText = function(text, cb) {
  text = escapeSpecialChars(text, "'");
  this.proxy("au.setAlertText('" + text + "')", cb);
};

iOSController.postAcceptAlert = function(cb) {
  this.proxy("au.acceptAlert()", cb);
};

iOSController.postDismissAlert = function(cb) {
  this.proxy("au.dismissAlert()", cb);
};

iOSController.lock = function(secs, cb) {
  this.proxy(["au.lock(", secs, ")"].join(''), cb);
};

iOSController.background = function(secs, cb) {
  this.proxy(["au.background(", secs, ")"].join(''), cb);
};

iOSController.getOrientation = function(cb) {
  this.proxy("au.getScreenOrientation()", cb);
};

iOSController.setOrientation = function(orientation, cb) {
  var command = ["au.setScreenOrientation('", orientation ,"')"].join('');
  this.proxy(command, function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
      this.curOrientation = orientation;
      cb(err, res);
    }
  }.bind(this));
};

iOSController.localScreenshot = function(desiredFile, cb) {
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

iOSController.getScreenshot = function(cb) {
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

iOSController.fakeFlick = function(xSpeed, ySpeed, swipe, cb) {
  var command = "";
  if (swipe) {
    command = ["au.touchSwipeFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }
  else {
    command = ["au.touchFlickFromSpeed(", xSpeed, ",", ySpeed,")"].join('');
  }

  this.proxy(command, cb);
};

iOSController.fakeFlickElement = function(elementId, xoffset, yoffset, speed, cb) {
  var command = ["au.getElement('", elementId, "').touchFlick(", xoffset, ",", yoffset, ",", speed, ")"].join('');

  this.proxy(command, cb);
};

iOSController.drag = function(startX, startY, endX, endY, steps, elementId, destElId, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.swipe = function(startX, startY, endX, endY, duration, touchCount, elId, cb) {
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

iOSController.rotate = function(x, y, radius, rotation, duration, touchCount, elId, cb) {
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

iOSController.pinchClose = function(startX, startY, endX, endY, duration,
    percent, steps, elId, cb) {
  var command;
  var fromPointObject = {'x' : startX, 'y' : startY};
  var toPointObject = {'x' : endX, 'y' : endY};
  if (elId) {
    command = ["au.getElement('", elId, "').pinchCloseFromToForDuration(",
      JSON.stringify(fromPointObject),  ",",  JSON.stringify(toPointObject),
        ",", duration, ")"].join('');
    this.proxy(command, cb);
  } else {
    this.proxy("target.pinchCloseFromToForDuration("+ JSON.stringify(fromPointObject) + "," + JSON.stringify(toPointObject) + "," + duration +")", cb);
  }
};

iOSController.pinchOpen = function(startX, startY, endX, endY, duration,
    percent, steps, elId, cb) {
  var command;
  var fromPointObject = {'x' : startX, 'y' : startY};
  var toPointObject = {'x' : endX, 'y' : endY};
  if (elId) {
    command = ["au.getElement('", elId, "').pinchOpenFromToForDuration(",
      JSON.stringify(fromPointObject), ",", JSON.stringify(toPointObject), ",",
      duration +")"].join('');
    this.proxy(command, cb);
  } else {
    this.proxy("target.pinchOpenFromToForDuration("+ JSON.stringify(fromPointObject) + "," + JSON.stringify(toPointObject) + "," + duration +")", cb);
  }
};

iOSController.flick = function(startX, startY, endX, endY, touchCount, elId,
    cb) {
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

iOSController.scrollTo = function(elementId, text, cb) {
    // we ignore text for iOS, as the element is the one being scrolled too
    var command = ["au.getElement('", elementId, "').scrollToVisible()"].join('');
    this.proxy(command, cb);
};

iOSController.shake = function(cb) {
  this.proxy("au.shake()", cb);
};

iOSController.setLocation = function(latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
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

iOSController.hideKeyboard = function(keyName, cb) {
  if (typeof keyName !== "string") {
    keyName = "Hide keyboard";
  }
  this.proxy("au.hideKeyboard('"+keyName+"')", cb);
};

iOSController.url = function(url, cb) {
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

iOSController.getUrl = function(cb) {
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

iOSController.active = function(cb) {
  if (this.curWindowHandle) {
    this.executeAtom('active_element', [], function(err, res) {
      cb(err, res);
    });
  } else {
    this.proxy("au.getActiveElement()", cb);
  }
};

iOSController.getWindowHandle = function(cb) {
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

iOSController.massagePage = function(page) {
  page.id = page.id.toString();
  return page;
};

iOSController.getWindowHandles = function(cb) {
  this.listWebFrames(function(pageArray) {
    this.windowHandleCache = _.map(pageArray, this.massagePage);
    cb(null, {
      status: status.codes.Success.code
      , value: _.pluck(this.windowHandleCache, 'id')
    });
  }.bind(this));
};

iOSController.setWindow = function(name, cb) {
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
          this.remote.disconnect(function(){
            this.curWindowHandle = name;
            this.remote.connect(name, function() {
              cb(null, {
                status: status.codes.Success.code
                , value: name
              });
            });
          }.bind(this));
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

iOSController.closeWindow = function(cb) {
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

iOSController.setSafariWindow = function(windowId, cb) {
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

iOSController.checkSuccess = function(err, res, cb) {
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

iOSController.leaveWebView = function(cb) {
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

iOSController.execute = function(script, args, cb) {
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

iOSController.executeAsync = function(script, args, responseUrl, cb) {
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

iOSController.convertElementForAtoms = deviceCommon.convertElementForAtoms;

iOSController.title = function(cb) {
  if (this.curWindowHandle === null) {
    cb(new NotImplementedError(), null);
  } else {
    this.executeAtom('title', [], cb, true);
  }
};

iOSController.moveTo = function(element, xoffset, yoffset, cb) {
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

iOSController.equalsWebElement = function(element, other, cb) {
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

iOSController.getCookies = function(cb) {
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

iOSController.setCookie = function(cookie, cb) {
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

iOSController.deleteCookie = function(cookieName, cb) {
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  var cookie = {name: cookieName, value: ""};
  this.setCookie(cookie, cb);
};

iOSController.deleteCookies = function(cb) {
  if (!this.curWindowHandle) {
    return cb(new NotImplementedError(), null);
  }
  this.getCookies(function(err, res) {
    if (this.checkSuccess(err, res, cb)) {
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

iOSController.getCurrentActivity= function(cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getLogTypes = function(cb) {
    return cb(null, {
        status: status.codes.Success.code
        , value: _.keys(logTypesSupported)
    });
};

iOSController.getLog = function(logType, cb) {
    // Check if passed logType is supported
    if (!_.has(logTypesSupported, logType)) {
        return cb(null, {
            status: status.codes.UnknownError.code
            , value: "Unsupported log type '" + logType + "' for this device, supported types : " + JSON.stringify(logTypesSupported)
        });
    }
    var logs;
    try {
        logs = this.logs.getLogs(logType);
    } catch (e) {
        return cb(e);
    }
    // If logs captured successfully send response with data, else send error
    if (logs) {
        return cb(null, {
            status: status.codes.Success.code
            , value: logs
        });
    } else {
        return cb(null, {
            status: status.codes.UnknownError.code
            , value: "Unknown error while getting logs"
        });
    }
};

module.exports = iOSController;
