"use strict";
var uuid = require('uuid-js')
  , path = require('path')
  , fs = require('fs')
  , async = require('async')
  , path = require('path')
  , _ = require('underscore')
  , exec = require('child_process').exec
  , status = require("../../server/status.js")
  , logger = require('../../server/logger.js').get('appium')
  , helpers = require('../../helpers.js')
  , escapeSpecialChars = helpers.escapeSpecialChars
  , parseWebCookies = helpers.parseWebCookies
  , rotateImage = helpers.rotateImage
  , request = require('request')
  , mkdirp = require('mkdirp')
  , AdmZip = require('adm-zip')
  , deviceCommon = require('../common.js')
  , js2xml = require("js2xmlparser2")
  , xpath = require("xpath")
  , XMLDom = require("xmldom")
  , settings = require('./settings.js')
  , IOSPerfLog = require('./ios-perf-log')
  , getSimRootsWithVersion = settings.getSimRootsWithVersion
  , errors = require('../../server/errors.js')
  , NotImplementedError = errors.NotImplementedError
  , NotYetImplementedError = errors.NotYetImplementedError;

var iOSController = {};
var FLICK_MS = 3000;

var NATIVE_WIN = "NATIVE_APP";
var WEBVIEW_WIN = "WEBVIEW";
var WEBVIEW_BASE = WEBVIEW_WIN + "_";

var logTypesSupported = {
  'syslog': 'Logs for iOS applications on real devices and simulators',
  'crashlog': 'Crash logs for iOS applications on real devices and simulators',
  'performance': 'Performance Logs - Debug Timelines on real devices and simulators'
};

iOSController.getStatusExtensions = function () {
  var ext = {};
  ext.isShuttingDown = this.isShuttingDown; // this is for testing purposes
  return ext;
};

iOSController.createGetElementCommand = function (strategy, selector, ctx,
    many) {
  var ext = many ? 's' : '';
  var command = "";
  ctx = !ctx ? ctx : ", '" + ctx + "'" ;
  switch (strategy) {
  case "name":
    command = ["au.getElement", ext, "ByName('", selector, "'", ctx,
               ")"].join('');
    break;
  case "accessibility id":
    command = ["au.getElement", ext, "ByAccessibilityId('", selector, "'", ctx,
               ")"].join('');
    break;
  case "id":
    command = ["au.getElement", ext, "ById('", selector, "')"].join('');
    break;
  case "-ios uiautomation":
    command = ["au.getElement", ext, "ByUIAutomation('", selector, "'", ctx,
               ")"].join('');
    break;
  default:
    command = ["au.getElement", ext, "ByType('", selector, "'", ctx,
               ")"].join('');
  }

  return command;
};

iOSController.findUIElementOrElements = function (strategy, selector, ctx, many, cb) {
  if (strategy !== "xpath") {
    selector = escapeSpecialChars(selector, "'");
  }
  if (typeof ctx === "undefined" || !ctx) {
    ctx = '';
  } else if (typeof ctx === "string") {
    ctx = escapeSpecialChars(ctx, "'");
  }

  try {
    selector = this.getSelectorForStrategy(strategy, selector);
  } catch (e) {
    return cb(null, {
      status: status.codes.UnknownError.code
    , value: e
    });
  }

  if (!selector) return;
  var doFind = function (findCb) {
    if (strategy === "xpath") {
      this.findUIElementsByXpath(selector, ctx, many, function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    } else if (strategy === "id") {
      // For the ID strategy, we first want to handle the selector as an
      // accessibility id. If no element is found by that strategy, we fall
      // back to searching for the string.
      var findByAxIdCmd = this.createGetElementCommand("accessibility id", selector, ctx, many);
      this.proxy(findByAxIdCmd, function (err, res) {
        this.handleFindCb(err, res, many, function (found, err, res) {
          if (found) {
            this.handleFindCb(err, res, many, findCb);
          } else {
            // Since no element was found using the accessibility id, we fall
            // back to search by string.
            var findByIdCmd = this.createGetElementCommand("id",
                                this.getLocalizedStringForSelector(selector),
                                ctx, many);
            this.proxy(findByIdCmd, function (err, res) {
              this.handleFindCb(err, res, many, findCb);
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
    } else {
      var command = this.createGetElementCommand(strategy, selector, ctx, many);
      this.proxy(command, function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    }
  }.bind(this);

  if (_.contains(this.supportedStrategies, strategy)) {
    this.implicitWaitForCondition(doFind, cb);
  } else {
    cb(null, {
      status: status.codes.UnknownError.code
    , value: "Sorry, we don't support the '" + strategy + "' locator " +
             "strategy for iOS."
    });
  }
};

var _pathFromDomNode = function (node) {
  var path = null;
  _.each(node.attributes, function (attrObj) {
    if (attrObj.name === "path") {
      path = attrObj.value;
    }
  });
  return path;
};

var _xmlSourceFromJson = function (jsonSource) {
  if (typeof jsonSource === "string") {
    jsonSource = JSON.parse(jsonSource);
  }
  return js2xml("AppiumAUT", jsonSource, {
    wrapArray: {enabled: false, elementName: "element"},
    declaration: {include: true},
    prettyPrinting: {indentString: "    "}
  });
};

var _performXpathQueryOnJson = function (selector, jsonSource) {
  var xmlSource = _xmlSourceFromJson(jsonSource);
  var dom = new XMLDom.DOMParser().parseFromString(xmlSource);
  return xpath.select(selector, dom);
};

iOSController.findUIElementsByXpath = function (selector, ctx, many, curRetry,
    cb) {
  if (typeof curRetry === "function") {
    cb = curRetry;
    curRetry = 0;
  }
  this.getSourceForElementForXML(ctx, function (err, res) {
    var selectedNodes;
    if (err || res.status !== 0) {
      logger.error("Error getting source, can't continue finding element " +
                   "by XPath");
      return cb(err, res);
    }
    try {
      selectedNodes = _performXpathQueryOnJson(selector, res.value);
    } catch (e) {
      return cb(e);
    }
    if (!many) selectedNodes = selectedNodes.slice(0, 1);
    var indexPaths = [];
    // filter out elements without 'path' attribute
    _.each(selectedNodes, function (node) {
      var ip = _pathFromDomNode(node);
      if (ip !== null) {
        indexPaths.push(ip);
      }
    });

    if (!many && indexPaths.length < 1) {
      // if we don't have any matching nodes, and we wanted at least one, fail
      return cb(null, {
        status: status.codes.NoSuchElement.code,
        value: null
      });
    } else if (indexPaths.length < 1) {
      // and if we don't have any matching nodes, return the empty array
      return cb(null, {
        status: status.codes.Success.code,
        value: []
      });
    }

    // otherwise look up the actual element by its index path
    var proxyCmd;
    if (!many) {
      proxyCmd = "au.getElementByIndexPath('" + indexPaths[0] + "')";
    } else {
      var ipArrString = JSON.stringify(indexPaths);
      proxyCmd = "au.getElementsByIndexPaths(" + ipArrString + ")";
    }
    // having index paths means we think elements should be there. Sometimes
    // uiauto lags in enabling us to get elements, so we retry a few times if
    // it can't find elements we know should be there. see uiauto code
    // for more logic
    this.proxy(proxyCmd, function (err, res) {
      if (err) return cb(err);
      // we get a StaleElementReference if uiauto can't find an element
      // by the path we mentioned
      if (res.status !== status.codes.Success.code &&
          curRetry < 3) {
        logger.debug("Got a warning from uiauto that some index paths " +
                    "could not be resolved, trying again");
        return setTimeout(function () {
          this.findUIElementsByXpath(selector, ctx, many, curRetry + 1, cb);
        }.bind(this), 300);
      }
      cb(err, res);
    }.bind(this));
  }.bind(this));
};

iOSController.getSourceForElementForXML = function (ctx, cb) {
  var _cb = cb;
  cb = function (err, res) {
    if (err) return _cb(err);

    // TODO: all this json/xml logic is very expensive, we need
    // to use a SAX parser instead.
    if (res) {
      if (res.value) res.value = JSON.stringify(res.value);
      _cb(err, res);
    } else {
      // this should never happen but we've received bug reports; this will help us track down
      // what's wrong in getTreeForXML
      _cb(new Error("Bad response from getTreeForXML. Err was " + err + " and res was " + JSON.stringify(res)));
    }
  };
  if (!ctx) {
    this.proxy("au.mainApp().getTreeForXML()", cb);
  } else {
    this.proxy("au.getElement('" + ctx + "').getTreeForXML()", cb);
  }
};

iOSController.getLocalizedStringForSelector = function (selector) {
  var newSelector = selector;

  var strings = this.localizableStrings;
  if (strings) {
    var localizedSelector = strings[selector];
    if (localizedSelector) {
      newSelector = localizedSelector;
    } else {
      logger.debug("Id selector, '" + selector + "', not found in " +
                  "Localizable.strings.");
    }
  }

  return newSelector;
};

iOSController.getSelectorForStrategy = function (strategy, selector) {
  var newSelector = selector;
  if (strategy === 'class name') {
    if (selector.indexOf('UIA') !== 0) {
      throw new TypeError("The class name selector must use full UIA class " +
                          "names.  Try 'UIA" + selector + "' instead.");
    }
  }
  return newSelector;
};

iOSController.handleFindCb = function (err, res, many, findCb) {
  if (!res) res = {};
  if (!res.value) {
    res.status = status.codes.NoSuchElement.code;
  }
  if (!err && !many && res.status === 0) {
    findCb(true, err, res);
  } else if (!err && many && res.value && res.value.length > 0) {
    findCb(true, err, res);
  } else {
    findCb(false, err, res);
  }
};

iOSController.findWebElementOrElements = function (strategy, selector, ctx, many, cb) {
  var ext = many ? 's' : '';
  var atomsElement = this.getAtomsElement(ctx);
  var doFind = function (findCb) {
    this.executeAtom('find_element' + ext, [strategy, selector, atomsElement], function (err, res) {
      this.handleFindCb(err, res, many, findCb);
    }.bind(this));
  }.bind(this);
  this.implicitWaitForCondition(doFind, cb);
};

iOSController.findElementOrElements = function (strategy, selector, ctx, many, cb) {
  if (deviceCommon.checkValidLocStrat(strategy, this.curContext, cb)) {
    if (this.curContext) {
      this.findWebElementOrElements(strategy, selector, ctx, many, cb);
    } else {
      this.findUIElementOrElements(strategy, selector, ctx, many, cb);
    }
  }
};

iOSController.findElement = function (strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, false, cb);
};

iOSController.findElements = function (strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, null, true, cb);
};

iOSController.findElementFromElement = function (element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, false, cb);
};

iOSController.findElementsFromElement = function (element, strategy, selector, cb) {
  this.findElementOrElements(strategy, selector, element, true, cb);
};

iOSController.setValueImmediate = function (elementId, value, cb) {
  value = escapeSpecialChars(value, "'");
  var command = ["au.getElement('", elementId, "').setValue('", value, "')"].join('');
  this.proxy(command, cb);
};

iOSController.setValue = function (elementId, value, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('click', [atomsElement], function (err, res) {
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

iOSController.replaceValue = function (elementId, value, cb) {
  logger.debug("Not implemented for iOS, please use setValue as you would normally.");
  return cb(new NotYetImplementedError(), null);
};

iOSController.useAtomsElement = deviceCommon.useAtomsElement;

iOSController.click = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('click', [atomsElement], cb);
    }.bind(this));
  } else {
    if (this.useRobot) {
      var locCmd = "au.getElement('" + elementId + "').rect()";
      this.proxy(locCmd, function (err, res) {
        if (err) return cb(err, res);
        var rect = res.value;
        var pos = {x: rect.origin.x, y: rect.origin.y};
        var size = {w: rect.size.width, h: rect.size.height};
        var tapPoint = { x: pos.x + (size.w / 2), y: pos.y + (size.h / 2) };
        var tapUrl = this.args.robotUrl + "/tap/x/" + tapPoint.x + "/y/" + tapPoint.y;
        request.get(tapUrl, {}, cb);
      }.bind(this));
    } else {
      this.nativeTap(elementId, cb);
    }
  }
};

iOSController.nativeTap = function (elementId, cb) {
  var command = ["au.tapById('", elementId, "')"].join('');
  this.proxy(command, cb);
};


iOSController.nativeWebTap = function (elementId, cb) {
  this.useAtomsElement(elementId, cb, function (atomsElement) {
    this.executeAtom('get_top_left_coordinates', [atomsElement], function (err, res) {
      if (err || res.status !== 0) return cb(err, res);
      var x = res.value.x, y = res.value.y;
      this.executeAtom('get_size', [atomsElement], function (err, res) {
        if (err || res.status !== 0) return cb(err, res);
        var w = res.value.width, h = res.value.height;
        var clickX = x + (w / 2);
        var clickY = y + (h / 2);
        this.curWebCoords = {x: clickX, y: clickY};
        this.clickWebCoords(function (err, res) {
          // make sure real tap actually has time to register
          setTimeout(function () {
            cb(err, res);
          }, 500);
        });
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

iOSController.pushFile = function (base64Data, remotePath, cb) {
  if (this.realDevice) {
    logger.debug("Unsupported: cannot write files to physical device");
    return cb(new NotYetImplementedError(), null);
  }

  logger.debug("Pushing " + remotePath + " to iOS simulator");

  var writeFile = function (err, fullPath) {
    if (err) return cb(err);
    logger.debug("Attempting to write " + fullPath + "...");

    async.series([
      function (cb) {
        try {
          if (fs.existsSync(fullPath)) {
            logger.debug(fullPath + " already exists, deleting...");
            fs.unlinkSync(fullPath);
          }

          mkdirp.sync(path.dirname(fullPath));

          var content = new Buffer(base64Data, 'base64');
          var fd = fs.openSync(fullPath, 'w');
          fs.writeSync(fd, content, 0, content.length, 0);
          fs.closeSync(fd);
          logger.debug("Wrote " + content.length + "bytes to " + fullPath);
          cb(null);
        } catch (e) {
          cb(e);
        }
      }.bind(this),
    ], function (err) {
      logger.debug("Returning response");
      if (err) return cb(err);
      cb(null, {
        status: status.codes.Success.code
      });
    });
  };

  this._getFullPath(remotePath, writeFile);
};

/*
 *  Get the full path to an iOS simulator file.
 *  Calls cb(err, fullFilePath)
 *  /Some/Path                           fetches a file relative to the root of the device's filesystem.
 *  /Applications/AppName.app/Some/Path  fetches a file relative to the root of that Application's .app directory, adding in the GUID.
 *  So it looks something like: /Applications/GUID-GUID-GUID-GUID/Some/Path
 */
iOSController._getFullPath = function (remotePath, cb) {
  var fullPath = "";
  var v = (this.args.platformVersion || this.iOSSDKVersion);
  var simRoots = getSimRootsWithVersion(v);
  if (simRoots.length < 1) {
    return cb(new Error("Could not find simulator root for SDK version " +
                        v + "; have you launched this sim before?"));
  } else if (simRoots.length > 1) {
    logger.warn("There were multiple simulator roots for version " + v + ". " +
                "We may be pulling the file from the one you're not using!");
  }

  if (simRoots.length > 1) {
    var filteredSimRoots = simRoots.filter(function (root) {
      return fs.existsSync(root + "/Applications");
    });

    if (filteredSimRoots.length > 0) {
      simRoots = filteredSimRoots;
    }
  }

  var basePath = simRoots[0];

  var appName = null;

  if (this.args.app) {
    var appNameRegex = new RegExp("\\" + path.sep + "(\\w+\\.app)");
    var appNameMatches = appNameRegex.exec(this.args.app);
    if (appNameMatches) {
      appName = appNameMatches[1];
    }
  }

  if (remotePath.indexOf(appName) === 1) {
    logger.debug("We want an app-relative file");
    var findPath = basePath.replace(/\s/g, '\\ ');
    var findCmd = 'find ' + findPath + ' -name "' + appName + '"';
    exec(findCmd, function (err, stdout) {
      if (err) return cb(err);
      var appRoot = stdout.replace(/\n$/, '');
      var subPath = remotePath.substring(appName.length + 2);
      fullPath = path.resolve(appRoot, subPath);
      cb(null, fullPath);
    }.bind(this));
  } else {
    logger.debug("We want a sim-relative file");
    fullPath = path.resolve(basePath, remotePath);
    cb(null, fullPath);
  }
};


iOSController.pullFile = function (remotePath, cb) {
  logger.debug("Pulling " + remotePath + " from sim");
  if (this.realDevice) {
    return cb(new NotYetImplementedError(), null);
  }

  var readAndReturnFile = function (err, fullPath) {
    if (err) return cb(err);
    logger.debug("Attempting to read " + fullPath);
    fs.readFile(fullPath, {encoding: 'base64'}, function (err, data) {
      if (err) return cb(err);
      cb(null, {status: status.codes.Success.code, value: data});
    });
  };

  this._getFullPath(remotePath, readAndReturnFile);
};

iOSController.pullFolder = function (remotePath, cb) {
  logger.debug("Pulling " + remotePath + " from sim");
  if (this.realDevice) {
    return cb(new NotYetImplementedError(), null);
  }

  var bufferOnSuccess = function (buffer) {
    logger.debug("Converting in-memory zip file to base64 encoded string");
    var data = buffer.toString('base64');
    logger.debug("Returning in-memory zip file as base54 encoded string");
    cb(null, {status: status.codes.Success.code, value: data});
  };

  var bufferOnFail = function (err) {
    cb(new Error(err));
  };

  var zipAndReturnFolder = function (err, fullPath) {
    if (err) return cb(err);
    logger.debug("Adding " + fullPath + " to an in-memory zip archive");
    var zip = new AdmZip();
    zip.addLocalFolder(fullPath);
    zip.toBuffer(bufferOnSuccess, bufferOnFail);
  };

  this._getFullPath(remotePath, zipAndReturnFolder);

};

iOSController.touchLongClick = function (elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.touchDown = function (elId, x, y, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.touchUp = function (elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.touchMove = function (elId, startX, startY, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.toggleData = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.toggleFlightMode = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.toggleWiFi = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.toggleLocationServices = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getStrings = function (language, cb) {
  this.parseLocalizableStrings(function () {
    var strings = this.localizableStrings;
    if (strings && strings.length >= 1) strings = strings[0];

    cb(null, {
      status: status.codes.Success.code
    , value: strings
    });
  }.bind(this), language);
};

iOSController.executeAtom = function (atom, args, cb, alwaysDefaultFrame) {
  var counter = this.executedAtomsCounter++;
  var frames = alwaysDefaultFrame === true ? [] : this.curWebFrames;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.remote.executeAtom(atom, args, frames, function (err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }.bind(this));
  this.lookForAlert(cb, counter, 0, 5000);
};

iOSController.executeAtomAsync = function (atom, args, responseUrl, cb) {
  var counter = this.executedAtomsCounter++;
  this.returnedFromExecuteAtom[counter] = false;
  this.processingRemoteCmd = true;
  this.asyncResponseCb = cb;
  this.remote.executeAtomAsync(atom, args, this.curWebFrames, responseUrl, function (err, res) {
    this.processingRemoteCmd = false;
    if (!this.returnedFromExecuteAtom[counter]) {
      this.returnedFromExecuteAtom[counter] = true;
      res = this.parseExecuteResponse(res);
      cb(err, res);
    }
  }.bind(this));
  this.lookForAlert(cb, counter, 0, 5000);
};

iOSController.receiveAsyncResponse = function (asyncResponse) {
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

iOSController.lookForAlert = function (cb, counter, looks, timeout) {
  setTimeout(function () {
    if (typeof looks === 'undefined') {
      looks = 0;
    }
    if (this.instruments !== null) {
      if (!this.returnedFromExecuteAtom[counter] && looks < 11 && !this.selectingNewPage) {
        logger.debug("atom did not return yet, checking to see if " +
          "we are blocked by an alert");
        // temporarily act like we're not processing a remote command
        // so we can proxy the alert detection functionality
        this.alertCounter++;
        this.proxy("au.alertIsPresent()", function (err, res) {
          if (res !== null) {
            if (res.value === true) {
              logger.debug("Found an alert, returning control to client");
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

iOSController.clickCurrent = function (button, cb) {
  var noMoveToErr = {
    status: status.codes.UnknownError.code
  , value: "Cannot call click() before calling moveTo() to set coords"
  };

  if (this.isWebContext()) {
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

iOSController.clickCoords = function (coords, cb) {
  if (this.useRobot) {
    var tapUrl = this.args.robotUrl + "/tap/x/" + coords.x + "/y/" + coords.y;
    request.get(tapUrl, {}, cb);
  } else {
    var opts = coords;
    opts.tapCount = 1;
    opts.duration = 0.3;
    opts.touchCount = 1;
    var command = ["au.complexTap(" + JSON.stringify(opts) + ")"].join('');
    this.proxy(command, cb);
  }
};

iOSController.clickWebCoords = function (cb) {
  var coords = this.curWebCoords
    , wvCmd = "au.getElementsByType('webview')"
    , webviewIndex = this.webContextIndex();

  // add static offset for safari in landscape mode
  var yOffset = this.curOrientation === "LANDSCAPE" ?
     this.landscapeWebCoordsOffset :
     0;

  // absolutize web coords
  this.proxy(wvCmd, function (err, res) {
    if (err) return cb(err, res);
    if (res.value.length < 1) {
      return cb(null, {
        status: status.codes.UnknownError.code
      , value: "Could not find any webviews to click inside!"
      });
    }
    if (typeof res.value[webviewIndex] === "undefined") {
      logger.warn("Could not find webview at index " + webviewIndex + ", " +
                  "taking last available one for clicking purposes");
      webviewIndex = res.value.length - 1;
    }
    var realDims, wvDims, wvPos;
    var step1 = function () {
      var wvId = res.value[webviewIndex].ELEMENT;
      var locCmd = "au.getElement('" + wvId + "').rect()";
      this.proxy(locCmd, function (err, res) {
        if (err) return cb(err, res);
        var rect = res.value;
        wvPos = {x: rect.origin.x, y: rect.origin.y};
        realDims = {w: rect.size.width, h: rect.size.height};
        next();
      });
    }.bind(this);
    var step2 = function () {
      var cmd = "(function () { return {w: document.width, h: document.height}; })()";
      this.remote.execute(cmd, function (err, res) {
        wvDims = {w: res.result.value.w, h: res.result.value.h};
        next();
      });
    }.bind(this);
    var next = function () {
      if (wvDims && realDims && wvPos) {
        var xRatio = realDims.w / wvDims.w;
        var yRatio = realDims.h / wvDims.h;
        var serviceBarHeight = 20;
        coords = {
          x: wvPos.x + (xRatio * coords.x)
        , y: wvPos.y + yOffset + (yRatio * coords.y) - serviceBarHeight
        };
        logger.debug("Converted web coords " + JSON.stringify(this.curWebCoords) +
                    "into real coords " + JSON.stringify(coords));
        this.clickCoords(coords, cb);
      }
    }.bind(this);
    step1();
    step2();
  }.bind(this));
};

iOSController.submit = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('submit', [atomsElement], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.pressKeyCode = function (keycode, metastate, cb) {
  cb(new NotImplementedError(), null);
};

iOSController.longPressKeyCode = function (keycode, metastate, cb) {
  cb(new NotImplementedError(), null);
};

iOSController.keyevent = function (keycode, metastate, cb) {
  cb(new NotImplementedError(), null);
};

iOSController.complexTap = function (tapCount, touchCount, duration, x, y, elementId, cb) {
  var command;
  var  options = {
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

iOSController.clear = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('clear', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').setValue('')"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getText = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('get_text', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').text()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getName = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      var script = "return arguments[0].tagName.toLowerCase()";
      this.executeAtom('execute_script', [script, [atomsElement]], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').type()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getAttribute = function (elementId, attributeName, cb) {
  if (this.isWebContext()) {
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
    if (_.contains(['label', 'name', 'value', 'values', 'hint'], attributeName)) {
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

iOSController.getLocation = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('get_top_left_coordinates', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId,
      "').getElementLocation()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getSize = function (elementId, cb) {
  if (this.isWebContext()) {
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

iOSController.getWindowSize = function (windowHandle, cb) {
  if (windowHandle !== "current") {
    cb(null, {
      status: status.codes.NoSuchWindow.code
    , value: "Currently only getting current window size is supported."
    });
  }

  if (this.isWebContext()) {
    this.executeAtom('get_window_size', [], function (err, res) {
      cb(null, {
        status: status.codes.Success.code
      , value: res
      });
    });
  } else {
    this.proxy("au.getWindowSize()", cb);
  }
};

iOSController.mobileWebNav = function (navType, cb) {
  this.remote.willNavigateWithoutReload = true;
  this.executeAtom('execute_script', ['history.' + navType + '();', null], cb);
};

iOSController.back = function (cb) {
  if (this.isWebContext()) {
    this.mobileWebNav("back", cb);
  } else {
    var command = "au.back();";
    this.proxy(command, cb);
  }
};

iOSController.forward = function (cb) {
  if (this.isWebContext()) {
    this.mobileWebNav("forward", cb);
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.refresh = function (cb) {
  if (this.isWebContext()) {
    this.executeAtom('refresh', [], cb);
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.getPageIndex = function (elementId, cb) {
  if (this.isWebContext()) {
    cb(new NotImplementedError(), null);
  } else {
    var command = ["au.getElement('", elementId, "').pageIndex()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.keys = function (keys, cb) {
  keys = escapeSpecialChars(keys, "'");
  if (this.isWebContext()) {
    this.active(function (err, res) {
      if (err || typeof res.value.ELEMENT === "undefined") {
        return cb(err, res);
      }
      this.setValue(res.value.ELEMENT, keys, cb);
    }.bind(this));
  } else {
    var command = ["au.sendKeysToActiveElement('", keys, "')"].join('');
    this.proxy(command, cb);
  }
};

iOSController.frame = function (frame, cb) {
  if (this.isWebContext()) {
    var atom;
    if (frame === null) {
      this.curWebFrames = [];
      logger.debug("Leaving web frame and going back to default content");
      cb(null, {
        status: status.codes.Success.code
      , value: ''
      });
    } else {
      if (typeof frame.ELEMENT !== "undefined") {
        this.useAtomsElement(frame.ELEMENT, cb, function (atomsElement) {
          this.executeAtom('get_frame_window', [atomsElement], function (err, res) {
            if (this.checkSuccess(err, res, cb)) {
              logger.debug("Entering new web frame: " + res.value.WINDOW);
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
        this.executeAtom(atom, [frame], function (err, res) {
          if (this.checkSuccess(err, res, cb)) {
            if (res.value === null || typeof res.value.WINDOW === "undefined") {
              cb(null, {
                status: status.codes.NoSuchFrame.code
              , value: ''
              });
            } else {
              logger.debug("Entering new web frame: " + res.value.WINDOW);
              this.curWebFrames.unshift(res.value.WINDOW);
              cb(err, res);
            }
          }
        }.bind(this));
      }
    }
  } else {
    frame = frame ? frame : 'target.frontMostApp()';
    var command = ["wd_frame = ", frame].join('');
    this.proxy(command, cb);
  }
};

iOSController.implicitWait = function (ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.debug("Set iOS implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
  , value: null
  });
};

iOSController.asyncScriptTimeout = function (ms, cb) {
  this.asyncWaitMs = parseInt(ms, 10);
  logger.debug("Set iOS async script timeout to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
  , value: null
  });
};

iOSController.elementDisplayed = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('is_displayed', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isDisplayed()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.elementEnabled = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('is_enabled', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isEnabled() === 1"].join('');
    this.proxy(command, cb);
  }
};

iOSController.elementSelected = function (elementId, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('is_selected', [atomsElement], cb);
    }.bind(this));
  } else {
    var command = ["au.getElement('", elementId, "').isSelected()"].join('');
    this.proxy(command, cb);
  }
};

iOSController.getCssProperty = function (elementId, propertyName, cb) {
  if (this.isWebContext()) {
    this.useAtomsElement(elementId, cb, function (atomsElement) {
      this.executeAtom('get_value_of_css_property', [atomsElement,
        propertyName], cb);
    }.bind(this));
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.getPageSource = function (cb) {
  if (this.isWebContext()) {
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
    this.getSourceForElementForXML(null, function (err, res) {
      var xmlSource;
      if (err || res.status !== 0) return cb(err, res);
      try {
        xmlSource = _xmlSourceFromJson(res.value);
      } catch (e) {
        return cb(e);
      }
      return cb(null, {
        status: status.codes.Success.code
      , value: xmlSource
      });
    }.bind(this));
  }
};

iOSController.getAlertText = function (cb) {
  this.proxy("au.getAlertText()", cb);
};

iOSController.setAlertText = function (text, cb) {
  text = escapeSpecialChars(text, "'");
  this.proxy("au.setAlertText('" + text + "')", cb);
};

iOSController.postAcceptAlert = function (cb) {
  this.proxy("au.acceptAlert()", cb);
};

iOSController.postDismissAlert = function (cb) {
  this.proxy("au.dismissAlert()", cb);
};

iOSController.lock = function (secs, cb) {
  this.proxy(["au.lock(", secs, ")"].join(''), cb);
};

iOSController.isLocked = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.background = function (secs, cb) {
  this.proxy(["au.background(", secs, ")"].join(''), cb);
};

iOSController.getOrientation = function (cb) {
  this.proxy("au.getScreenOrientation()", function (err, res) {
    if (res && res.status === status.codes.Success.code) {
      // keep track of orientation for our own purposes
      logger.debug("Setting internal orientation to " + res.value);
      this.curOrientation = res.value;
    }
    cb(err, res);
  });
};

iOSController.setOrientation = function (orientation, cb) {
  var command = ["au.setScreenOrientation('", orientation, "')"].join('');
  this.proxy(command, function (err, res) {
    if (res && res.status === 0) {
      this.curOrientation = orientation;
    }
    cb(err, res);
  }.bind(this));
};

iOSController.getScreenshot = function (cb) {
  var guid = uuid.create();
  var command = ["au.capture('screenshot", guid, "')"].join('');

  var screenshotFolder = "/tmp/appium-instruments/Run 1/";
  if (!fs.existsSync(screenshotFolder)) {
    mkdirp.sync(screenshotFolder);
  }

  var shotPath = [screenshotFolder, 'screenshot', guid, ".png"].join("");
  // Retrying the whole screenshot process for three times.
  async.retry(3,
    function (cb) {
      async.waterfall([
        function (cb) { this.getOrientation(function () { cb(); }); }.bind(this),
        function (cb) { this.proxy(command, cb); }.bind(this),
        function (response, cb) {
          var data = null;
          var count = 0;
          async.until(
            function () { return data; },
            function (cb) {
              setTimeout(function () {
                fs.readFile(shotPath, function (err, _data) {
                  if (err && ++count > 20) {
                    return cb(new Error("Timed out waiting for screenshot file. " + err.toString()));
                  }
                  if (!err) {
                    data = _data;
                  }
                  cb();
                });
              }, 300);
            },
            function (err) {
              cb(err, response, data);
            }
          );
        }.bind(this),
        function (response, data, cb) {
          // rotate if necessary
          if (this.curOrientation === "LANDSCAPE") {
            // need to rotate 90 deg CC
            logger.debug("Rotating landscape screenshot");
            rotateImage(shotPath, -90, function (err) {
              if (err) return cb(new Error("Could not rotate screenshot appropriately"), null);
              fs.readFile(shotPath, function read(err, _data) {
                if (err) return cb(new Error("Could not retrieve screenshot file following rotate. " + err.toString()));
                cb(null, response, _data);
              });
            });
          } else cb(null, response, data);
        }.bind(this),
        function (response, data, cb) {
          var b64data = new Buffer(data).toString('base64');
          response.value = b64data;
          cb(null, response);
        }
      ], cb);
    }.bind(this), cb);
};

iOSController.fakeFlick = function (xSpeed, ySpeed, swipe, cb) {
  var command = "";
  if (swipe) {
    command = ["au.touchSwipeFromSpeed(", xSpeed, ",", ySpeed, ")"].join('');
    this.proxy(command, cb);
  } else {
    command = ["au.touchFlickFromSpeed(", xSpeed, ",", ySpeed, ")"].join('');
    this.proxyWithMinTime(command, FLICK_MS, cb);
  }

};

iOSController.fakeFlickElement = function (elementId, xoffset, yoffset, speed, cb) {
  if (this.isWebContext()) {
    return cb(new NotYetImplementedError(), null);
  }
  var command = ["au.getElement('", elementId, "').touchFlick(", xoffset, ",",
      yoffset, ",", speed, ")"].join('');
  this.proxyWithMinTime(command, FLICK_MS, cb);
};

iOSController.drag = function (startX, startY, endX, endY, duration, touchCount, elId, destElId, cb) {
  var command;
  if (elId) {
    if (this.isWebContext()) {
      return cb(new NotYetImplementedError(), null);
    }
    command = ["au.getElement('", elId, "').drag(", startX, ',', startY, ',',
      endX, ',', endY, ',', duration, ',', touchCount, ")"].join('');
  } else {
    command = ["au.dragApp(", startX, ',', startY, ',', endX, ',', endY, ',',
      duration, ")"].join('');
  }
  // wait for device to complete swipe
  this.proxy(command, function (err, res) {
    setTimeout(function () {
      cb(err, res);
    }, duration * 1000);
  });
};

iOSController.swipe = function (startX, startY, endX, endY, duration, touchCount, elId, cb) {
  this.drag(startX, startY, endX, endY, duration, touchCount, elId, null, cb);
};

iOSController.rotate = function (x, y, radius, rotation, duration, touchCount, elId, cb) {
  var command;
  var location = {'x' : x, 'y' : y};
  var options = {'duration' : duration, 'radius' : radius, 'rotation' : rotation, 'touchCount' : touchCount};
  if (elId) {
    if (this.isWebContext()) {
      return cb(new NotYetImplementedError(), null);
    }
    command = "au.getElement('" + elId + "').rotateWithOptions(" + JSON.stringify(location) +
              "," + JSON.stringify(options) + ")";
    this.proxy(command, cb);
  } else {
    this.proxy("target.rotateWithOptions(" + JSON.stringify(location) + "," + JSON.stringify(options) + ")", cb);
  }
};

iOSController.pinchClose = function (startX, startY, endX, endY, duration,
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
    this.proxy("target.pinchCloseFromToForDuration(" + JSON.stringify(fromPointObject) +
      "," + JSON.stringify(toPointObject) + "," + duration + ")", cb);
  }
};

iOSController.pinchOpen = function (startX, startY, endX, endY, duration,
    percent, steps, elId, cb) {
  var command;
  var fromPointObject = {'x' : startX, 'y' : startY};
  var toPointObject = {'x' : endX, 'y' : endY};
  if (elId) {
    if (this.isWebContext()) {
      return cb(new NotYetImplementedError(), null);
    }
    command = ["au.getElement('", elId, "').pinchOpenFromToForDuration(",
      JSON.stringify(fromPointObject), ",", JSON.stringify(toPointObject), ",",
      duration + ")"].join('');
    this.proxy(command, cb);
  } else {
    this.proxy("target.pinchOpenFromToForDuration(" + JSON.stringify(fromPointObject) +
      "," + JSON.stringify(toPointObject) + "," + duration + ")", cb);
  }
};

iOSController.flick = function (startX, startY, endX, endY, touchCount, elId,
    cb) {
  var command;
  if (elId) {
    if (this.isWebContext()) {
      return cb(new NotYetImplementedError(), null);
    }
    command = ["au.getElement('", elId, "').flick(", startX, ',', startY, ',',
      endX, ',', endY, ',', touchCount, ")"].join('');
  } else {
    command = ["au.flickApp(", startX, ',', startY, ',', endX, ',', endY,
      ")"].join('');
  }
  this.proxyWithMinTime(command, FLICK_MS, cb);
};

iOSController.scrollTo = function (elementId, text, direction, cb) {
  if (this.isWebContext()) {
    return cb(new NotYetImplementedError(), null);
  }
  // we ignore text for iOS, as the element is the one being scrolled too
  var command = ["au.getElement('", elementId, "').scrollToVisible()"].join('');
  this.proxy(command, cb);
};

iOSController.scroll = function (elementId, direction, cb) {
  direction = direction.charAt(0).toUpperCase() + direction.slice(1);
  // By default, scroll the first scrollview.
  var command = "au.scrollFirstView('" + direction + "')";
  if (elementId) {
    if (this.isWebContext()) {
      return cb(new NotYetImplementedError(), null);
    }
    // if elementId is defined, call scrollLeft, scrollRight, scrollUp, and scrollDown on the element.
    command = ["au.getElement('", elementId, "').scroll", direction, "()"].join('');
  }
  this.proxy(command, cb);
};

iOSController.shake = function (cb) {
  this.proxy("au.shake()", cb);
};

iOSController.setLocation = function (latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
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
    this.proxy("target.setLocationWithOptions(" + JSON.stringify(coordinates) + "," +
      JSON.stringify(options) + ")", cb);
  } else {
    this.proxy("target.setLocation(" + JSON.stringify(coordinates) + ")", cb);
  }
};

iOSController.hideKeyboard = function (strategy, key, cb) {
  this.proxy("au.hideKeyboard(" +
    "'" + strategy + "'" +
    (key ? ",'" + key + "'" : "") +
    ")",
  cb);
};

iOSController.url = function (url, cb) {
  if (this.isWebContext()) {
    // make sure to clear out any leftover web frames
    this.curWebFrames = [];
    this.processingRemoteCmd = true;
    this.remote.navToUrl(url, function () {
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

iOSController.getUrl = function (cb) {
  if (this.isWebContext()) {
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
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.active = function (cb) {
  if (this.isWebContext()) {
    this.executeAtom('active_element', [], function (err, res) {
      cb(err, res);
    });
  } else {
    this.proxy("au.getActiveElement()", cb);
  }
};

iOSController.isWebContext = function () {
  return this.curContext !== null && this.curContext !== NATIVE_WIN;
};

iOSController.webContextIndex = function () {
  return this.curContext.replace(WEBVIEW_BASE, "") - 1;
};

iOSController.getCurrentContext = function (cb) {
  var err = null, response = null;
  if (this.curContext) {
    response = {
      status: status.codes.Success.code
    , value: WEBVIEW_BASE + this.curContext
    };
  } else {
    response = {
      status: status.codes.Success.code
    , value: null
    };
  }
  cb(err, response);
};

iOSController.getContexts = function (cb) {
  this.listWebFrames(function (err, webviews) {
    if (err) {
      return cb(err);
    }
    var ctxs = [NATIVE_WIN];
    this.contexts = [NATIVE_WIN];
    _.each(webviews, function (view) {
      ctxs.push(WEBVIEW_BASE + view.id);
      this.contexts.push(view.id.toString());
    }.bind(this));
    cb(null, {
      status: status.codes.Success.code
    , value: ctxs
    });
  }.bind(this));
};

iOSController.setContext = function (name, callback, skipReadyCheck) {
  var cb = function (err, res) {
    if (!err && res.status === status.codes.Success.code && this.perfLogEnabled) {
      logger.debug('Starting performance log on ' + this.curContext);
      this.logs.performance = new IOSPerfLog(this.remote);
      this.logs.performance.startCapture(function () {
        callback(err, res);
      });
    } else {
      callback(err, res);
    }
  }.bind(this);

  logger.debug("Attempting to set context to '" + name + "'");
  if (name === this.curContext) {
    cb(null, {
      status: status.codes.Success.code
    , value: ""
    });
  } else if (name === NATIVE_WIN || name === null) {
    if (this.curContext === null || this.curContext === NATIVE_WIN) {
      cb(null, {
        status: status.codes.Success.code
      , value: ""
      });
    } else {
      this.curContext = null;
      //TODO: this condition should be changed to check if the webkit protocol is being used.
      if (this.args.udid) {
        this.remote.disconnect();
        this.remote = null;
      }
      cb(null, {
        status: status.codes.Success.code
      , value: ''
      });
    }
  } else {
    var idx = name.replace(WEBVIEW_BASE, '');
    if (idx === WEBVIEW_WIN) {
      // allow user to pass in "WEBVIEW" without an index
      idx = '1';
    }
    var pickContext = function () {
      if (_.contains(this.contexts, idx)) {
        var pageIdKey = parseInt(idx, 10);
        var next = function () {
          this.processingRemoteCmd = true;
          if (this.args.udid === null) {
            this.remote.selectPage(pageIdKey, function () {
              this.curContext = idx;
              cb(null, {
                status: status.codes.Success.code
              , value: ''
              });
              this.processingRemoteCmd = false;
            }.bind(this), skipReadyCheck);
          } else {
            if (name === this.curContext) {
              logger.debug("Remote debugger is already connected to window [" + name + "]");
              cb(null, {
                status: status.codes.Success.code
              , value: name
              });
            } else {
              this.remote.disconnect(function () {
                this.curContext = idx;
                this.remote.connect(idx, function () {
                  cb(null, {
                    status: status.codes.Success.code
                  , value: name
                  });
                });
              }.bind(this));
            }
          }
        }.bind(this);
        next();
      } else {
        cb(null, {
          status: status.codes.NoSuchContext.code
        , value: "Context '" + name + "' does not exist"
        });
      }
    }.bind(this);

    // only get contexts if they haven't already been gotten
    if (typeof this.contexts === 'undefined') {
      this.getContexts(function () {
        pickContext();
      }.bind(this));
    } else {
      pickContext();
    }
  }
};

iOSController.getWindowHandle = function (cb) {
  if (this.isWebContext()) {
    var windowHandle = this.curContext;
    var response = {
      status: status.codes.Success.code
    , value: windowHandle
    };
    cb(null, response);
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.massagePage = function (page) {
  page.id = page.id.toString();
  return page;
};

iOSController.getWindowHandles = function (cb) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }

  this.listWebFrames(function (err, pageArray) {
    if (err) {
      return cb(err);
    }
    this.windowHandleCache = _.map(pageArray, this.massagePage);
    var idArray = _.pluck(this.windowHandleCache, 'id');
    // since we use this.contexts to manage selecting debugger pages, make
    // sure it gets populated even if someone did not use the
    // getContexts method
    if (!this.contexts) {
      this.contexts = idArray;
    }
    cb(null, {
      status: status.codes.Success.code
    , value: idArray
    });
  }.bind(this));
};

iOSController.setWindow = function (name, cb, skipReadyCheck) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }

  if (_.contains(_.pluck(this.windowHandleCache, 'id'), name)) {
    var pageIdKey = parseInt(name, 10);
    var next = function () {
      this.processingRemoteCmd = true;
      if (this.args.udid === null) {
        this.remote.selectPage(pageIdKey, function () {
          this.curContext = pageIdKey.toString();
          this.curWindowHandle = pageIdKey.toString();
          cb(null, {
            status: status.codes.Success.code
          , value: ''
          });
          this.processingRemoteCmd = false;
        }.bind(this), skipReadyCheck);
      } else {
        if (name === this.curWindowHandle) {
          logger.debug("Remote debugger is already connected to window [" + name + "]");
          cb(null, {
            status: status.codes.Success.code
          , value: name
          });
        } else if (_.contains(_.pluck(this.windowHandleCache, 'id'), name)) {
          this.remote.disconnect(function () {
            this.curContext = name;
            this.curWindowHandle = name;
            this.remote.connect(name, function () {
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

iOSController.closeWindow = function (cb) {
  if (this.isWebContext()) {
    var script = "return window.open('','_self').close();";
    this.executeAtom('execute_script', [script, []], function (err, res) {
      setTimeout(function () {
        cb(err, res);
      }, 500);
    }, true);
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.setSafariWindow = function (windowId, cb) {
  var checkPages = function (_cb) {
    this.findElement('name', 'Pages', function (err, res) {
      if (this.checkSuccess(err, res, _cb)) {
        this.getAttribute(res.value.ELEMENT, 'value', function (err, res) {
          if (this.checkSuccess(err, res, _cb)) {
            if (res.value === "") {
              _cb(err, res);
            } else {
              _cb();
            }
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this);

  var tapPages = function (_cb) {
    this.findElement('name', 'Pages', function (err, res) {
      if (this.checkSuccess(err, res, _cb)) {
        this.nativeTap(res.value.ELEMENT, function (err, res) {
          if (this.checkSuccess(err, res, _cb)) {
            _cb();
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this);

  var selectPage = function (_cb) {
    this.findElement('class name', 'UIAPageIndicator', function (err, res) {
      if (this.checkSuccess(err, res, _cb)) {
        this.setValue(res.value.ELEMENT, windowId, function (err, res) {
          if (this.checkSuccess(err, res, _cb)) {
            _cb();
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this);

  var doneWithPages = function (_cb) {
    this.findElement('name', 'Done', function (err, res) {
      if (this.checkSuccess(err, res, _cb)) {
        this.nativeTap(res.value.ELEMENT, function (err, res) {
          if (this.checkSuccess(err, res, _cb)) {
            _cb();
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this);

  async.series([checkPages, tapPages, selectPage, doneWithPages],
      function (err) { cb(err); });
};

iOSController.checkSuccess = function (err, res, cb) {
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

iOSController.execute = function (script, args, cb) {
  if (this.isWebContext()) {
    this.convertElementForAtoms(args, function (err, res) {
      if (err) {
        cb(null, res);
      } else {
        this.executeAtom('execute_script', [script, res], cb);
      }
    }.bind(this));
  } else {
    this.proxy(script, cb);
  }
};

iOSController.executeAsync = function (script, args, responseUrl, cb) {
  if (this.isWebContext()) {
    logger.debug("Response url for executeAsync is " + responseUrl);
    this.convertElementForAtoms(args, function (err, res) {
      if (err) {
        cb(null, res);
      } else {
        this.executeAtomAsync('execute_async_script', [script, args, this.asyncWaitMs], responseUrl, cb);
      }
    }.bind(this));
  } else {
    this.proxy(script, cb);
  }
};

iOSController.convertElementForAtoms = deviceCommon.convertElementForAtoms;

iOSController.title = function (cb) {
  if (this.isWebContext()) {
    this.executeAtom('title', [], cb, true);
  } else {
    cb(new NotImplementedError(), null);
  }
};

iOSController.moveTo = function (element, xoffset, yoffset, cb) {
  this.getLocation(element, function (err, res) {
    if (err) return cb(err, res);
    var coords = {
      x: res.value.x + xoffset
    , y: res.value.y + yoffset
    };
    //console.log("moving mouse to coords:");
    //console.log(coords);
    if (this.isWebContext()) {
      this.curWebCoords = coords;
      this.useAtomsElement(element, cb, function (atomsElement) {
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

iOSController.equalsWebElement = function (element, other, cb) {
  var ctxElem = this.getAtomsElement(element);
  var otherElem = this.getAtomsElement(other);
  var retStatus = status.codes.Success.code
    , retValue = false;

  // We assume if it's referencing the same element id, then it's equal
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

iOSController.getCookies = function (cb) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }
  var script = "return document.cookie";
  this.executeAtom('execute_script', [script, []], function (err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var cookies;
      try {
        cookies = parseWebCookies(res.value);
      } catch (e) {
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

iOSController.setCookie = function (cookie, cb) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }

  var webCookie = encodeURIComponent(cookie.name) + "=" +
                  encodeURIComponent(cookie.value);

  var expiry = cookie.expiry || null;

  if (!expiry && cookie.value === "") {
    expiry = (new Date(0)).toUTCString();
  } else if (expiry && typeof expiry === "number") {
    expiry = (new Date(expiry * 1000)).toUTCString();
  }

  if (expiry) {
    webCookie += "; expires=" + expiry;
  }

  // if 'Path' field is not specified, Safari will not update cookies as expected; eg issue #1708
  if (!cookie.path) {
    cookie.path = "/";
  }

  webCookie += ";path=" + cookie.path;

  var script = "document.cookie = " + JSON.stringify(webCookie);
  this.executeAtom('execute_script', [script, []], function (err, res) {
    if (this.checkSuccess(err, res, cb)) {
      cb(null, {
        status: status.codes.Success.code
      , value: true
      });
    }
  }.bind(this), true);
};

iOSController.deleteCookie = function (cookieName, cb) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }
  var cookie = {name: cookieName, value: ""};
  this.setCookie(cookie, cb);
};

iOSController.deleteCookies = function (cb) {
  if (!this.isWebContext()) {
    return cb(new NotImplementedError(), null);
  }
  this.getCookies(function (err, res) {
    if (this.checkSuccess(err, res, cb)) {
      var numCookies = res.value.length;
      var cookies = res.value;
      if (numCookies) {
        var returned = false;
        var deleteNextCookie = function (cookieIndex) {
          if (!returned) {
            var cookie = cookies[cookieIndex];
            this.deleteCookie(cookie.name, function (err, res) {
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

iOSController.endCoverage = function (intentToBroadcast, ecOnDevicePath, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getCurrentActivity = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getLogTypes = function (cb) {
  return cb(null, {
    status: status.codes.Success.code
  , value: _.keys(logTypesSupported)
  });
};

iOSController.getLog = function (logType, cb) {
  // Check if passed logType is supported
  if (!_.has(logTypesSupported, logType)) {
    return cb(null, {
      status: status.codes.UnknownError.code
    , value: "Unsupported log type '" + logType + "' for this device, supported types : " + JSON.stringify(logTypesSupported)
    });
  }
  var logs;
  try {
    logs = this.logs[logType].getLogs();
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

iOSController.handleTap = function (gesture, cb) {
  var options = gesture.options;
  var cmdBase;
  if (options.element) {
    cmdBase = ['au.getElement(\'', options.element, '\')'];
  } else {
    cmdBase = ['UIATarget.localTarget().frontMostApp()'];
  }

  // start by getting the size and position of the element we are tapping
  var cmd = cmdBase.concat('.rect()').join('');
  this.proxy(cmd, function (err, res) {
    if (err) return cb(err);

    // default to center
    var offsetX = 0.5;
    var offsetY = 0.5;

    // there are times when there is no error but no value is returned
    if (res.value) {
      var rect = res.value;
      var size = {w: rect.size.width, h: rect.size.height};

      // default options x/y to center, no matter the container
      options.x = (options.x || (size.w / 2));
      options.y = (options.y || (size.h / 2));

      offsetX = options.x / size.w;
      offsetY = options.y / size.h;
    }

    var opts = {
      tapOffset: {
        x: offsetX,
        y: offsetY
      },
      tapCount: options.count || 1,
      touchCount: 1
    };
    cmd = cmdBase.concat(['.tapWithOptions(', JSON.stringify(opts), ')']).join('');
    return this.proxy(cmd, cb);
  }.bind(this));
};

iOSController.performTouch = function (gestures, cb) {
  if (gestures.length === 1 && gestures[0].action === 'tap') {
    return this.handleTap(gestures[0], cb);
  }
  this.parseTouch(gestures, function (err, touchStateObjects) {
    if (err !== null) return cb(err);
    this.proxy("target.touch(" + JSON.stringify(touchStateObjects) + ")", cb);
  }.bind(this));
};

iOSController.parseTouch = function (gestures, cb) {
  // `release` is automatic in iOS
  if (_.last(gestures).action === 'release') {
    gestures.pop();
  }

  var touchStateObjects = [];
  var finishParsing = function () {
    var prevPos = null;

    // we need to change the time (which is now an offset)
    // and the position (which may be an offset)
    var time = 0;
    _.each(touchStateObjects, function (state) {
      if (state.touch[0] === false) {
        // if we have no position (this happens with `wait`) we need the previous one
        state.touch[0] = prevPos;
      } else if (state.touch[0].offset && prevPos) {
        // the current position is an offset
        state.touch[0].x += prevPos.x;
        state.touch[0].y += prevPos.y;
      }
      delete state.touch[0].offset;
      prevPos = state.touch[0];

      var timeOffset = state.timeOffset;
      time += timeOffset;
      state.time = time;

      delete state.timeOffset;
    });

    cb(null, touchStateObjects);
  }.bind(this);

  var needsPoint = function (action) {
    return _.contains(['press', 'moveTo', 'tap', 'longPress'], action);
  };

  var cycleThroughGestures = function () {
    var gesture = gestures.shift();
    if (typeof gesture === "undefined") {
      return finishParsing();
    }
    var tapPoint = false;

    if (needsPoint(gesture.action)) { // press, longPress, moveTo and tap all need a position
      var elementId = gesture.options.element;
      if (elementId) {
        var command = ["au.getElement('", elementId, "').rect()"].join('');
        this.proxy(command, function (err, res) {
          if (err) return cb(err); // short circuit and quit

          var rect = res.value;
          var pos = {x: rect.origin.x, y: rect.origin.y};
          var size = {w: rect.size.width, h: rect.size.height};

          if (gesture.options.x || gesture.options.y) {
            tapPoint = {
              offset: false,
              x: pos.x + (gesture.options.x || 0),
              y: pos.y + (gesture.options.y || 0)
            };
          } else {
            tapPoint = {
              offset: false,
              x: pos.x + (size.w / 2),
              y: pos.y + (size.h / 2)
            };
          }

          var touchStateObject = {
            timeOffset: 0.2,
            touch: [
              tapPoint
            ]
          };
          touchStateObjects.push(touchStateObject);
          cycleThroughGestures();
        }.bind(this));
      } else {
        // iOS expects absolute coordinates, so we need to save these as offsets
        // and then translate when everything is done
        tapPoint = {
          offset: true,
          x: (gesture.options.x || 0),
          y: (gesture.options.y || 0)
        };
        touchStateObject = {
          timeOffset: 0.2,
          touch: [
            tapPoint
          ]
        };
        touchStateObjects.push(touchStateObject);
        cycleThroughGestures();
      }
    } else {
      // in this case we need the previous entry's tap point
      tapPoint = false; // temporary marker
      var offset = 0.2;
      if (gesture.action === 'wait') {
        if (typeof gesture.options.ms !== 'undefined' || gesture.options.ms !== null) {
          offset = (parseInt(gesture.options.ms) / 1000);
        }
      }
      var touchStateObject = {
        timeOffset: offset,
        touch: [
          tapPoint
        ]
      };
      touchStateObjects.push(touchStateObject);
      cycleThroughGestures();
    }
  }.bind(this);

  cycleThroughGestures();
};

var mergeStates = function (states) {
  var getSlice = function (states, index) {
    var array = [];
    for (var i = 0; i < states.length; i++) {
      array.push(states[i][index]);
    }

    return array;
  };

  var timeSequence = function (states) {
    var seq = [];
    _.each(states, function (state) {
      var times = _.pluck(state, "time");
      seq = _.union(seq, times);
    });

    return seq.sort();
  };

  // for now we will just assume that the times line up
  var merged = [];
  _.each(timeSequence(states), function (time, index) {
    var slice = getSlice(states, index);
    var obj = {
      time: time,
      touch: []
    };
    _.each(slice, function (action) {
      obj.touch.push(action.touch[0]);
    });
    merged.push(obj);
  });
  return merged;
};

iOSController.performMultiAction = function (elementId, actions, cb) {
  var states = [];
  var cycleThroughActions = function () {
    var action = actions.shift();
    if (typeof action === "undefined") {
      var mergedStates = mergeStates(states);
      return this.proxy("target.touch(" + JSON.stringify(mergedStates) + ")", cb);
    }

    this.parseTouch(action, function (err, val) {
      if (err) return cb(err); // short-circuit the loop and send the error up
      states.push(val);

      cycleThroughActions();
    }.bind(this));
  }.bind(this);
  cycleThroughActions();
};

iOSController.openNotifications = function (cb) {
  cb(new NotImplementedError(), null);
};

iOSController.isIMEActivated = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.availableIMEEngines = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.getActiveIMEEngine = function (cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.activateIMEEngine = function (imeId, cb) {
  cb(new NotYetImplementedError(), null);
};

iOSController.deactivateIMEEngine = function (cb) {
  cb(new NotYetImplementedError(), null);
};

module.exports = iOSController;
