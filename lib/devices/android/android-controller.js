"use strict";

var errors = require('../../server/errors.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , helpers = require('../../helpers.js')
  , jwpSuccess = deviceCommon.jwpSuccess
  , status = require('../../server/status.js')
  , NotYetImplementedError = errors.NotYetImplementedError
  , parseXpath = require('../../xpath.js').parseXpath
  , exec = require('child_process').exec
  , fs = require('fs')
  , temp = require('temp')
  , async = require('async')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , xpath = require("xpath")
  , XMLDom = require("xmldom")
  , helpers = require('../../helpers.js')
  , warnDeprecatedCustom = helpers.logCustomDeprecationWarning
  , warnDeprecated = helpers.logDeprecationWarning;

var androidController = {};
var NATIVE_WIN = "NATIVE_APP";
var WEBVIEW_WIN = "WEBVIEW";
var WEBVIEW_BASE = WEBVIEW_WIN + "_";

androidController.keyevent = function (keycode, metastate, cb) {
  this.proxy(["pressKeyCode", {keycode: keycode, metastate: metastate}], cb);
};

androidController.defaultContext = function () {
  return NATIVE_WIN;
};

androidController.findElement = function (strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, false, "", cb);
};

androidController.findElements = function (strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, true, "", cb);
};

androidController.findUIElementOrElements = function (strategy, selector, many, context, cb) {
  if (!deviceCommon.checkValidLocStrat(strategy, false, cb)) {
    return;
  }
  if (strategy === "xpath") {
    warnDeprecatedCustom('locator strategy', 'xpath',
        "You used the xpath locator strategy to find an element. Xpath " +
        "support is undergoing massive change, which will become active " +
        "in Appium 1.0. To try out the new version of xpath, use the " +
        "'-real xpath' locator strategy instead of 'xpath'. Please take the " +
        "time to update your tests soon.");
  }
  if (strategy === "-real xpath" && context) {
    return cb(new Error("Cannot use xpath locator strategy from an element. " +
                        "It can only be used from the root element"));
  }
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
  if (strategy === "name") {
    helpers.logDeprecationWarning("Locator strategy", '"name"', '"accessibility id"');
  }
  var doFind = function (findCb) {
    if (strategy === "-real xpath") {
      this.findUIElementsByXPath(selector, many, function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    } else {
      this.proxy(["find", params], function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    }
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

androidController.handleFindCb = function (err, res, many, findCb) {
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

androidController.findElementFromElement = function (element, strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, false, element, cb);
};

androidController.findElementsFromElement = function (element, strategy, selector, cb) {
  this.findUIElementOrElements(strategy, selector, true, element, cb);
};

var _pathFromDomNode = function (node) {
  var path = "";
  _.each(node.attributes, function (attrObj) {
    if (attrObj.name === "index") {
      path = _pathFromDomNode(node.parentNode) + "/" + attrObj.value;
    }
  });
  return path;
};

androidController.findUIElementsByXPath = function (selector, many, cb) {
  this.getPageSourceXML(function (err, res) {
    if (err || res.status !== status.codes.Success.code) return cb(err, res);
    var dom, nodes;
    var xmlSource = res.value;
    try {
      dom = new XMLDom.DOMParser().parseFromString(xmlSource);
      nodes = xpath.select(selector, dom);
    } catch (e) {
      logger.error(e);
      return cb(e);
    }
    if (!many) nodes = nodes.slice(0, 1);
    var indexPaths = _.map(nodes, _pathFromDomNode);
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

    var findParams = {
      strategy: "index paths",
      selector: indexPaths.join(","),
      multiple: many
    };
    this.proxy(["find", findParams], cb);
  }.bind(this));
};

androidController.setValueImmediate = function (elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.findElementNameContains = function (name, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setValue = function (elementId, value, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: value}], cb);
};

androidController.click = function (elementId, cb) {
  this.proxy(["element:click", {elementId: elementId}], cb);
};

androidController.touchLongClick = function (elementId, x, y, duration, cb) {
  var opts = {};
  if (elementId) opts.elementId = elementId;
  if (x) opts.x = x;
  if (y) opts.y = y;
  if (duration) opts.duration = duration;
  this.proxy(["element:touchLongClick", opts], cb);
};

androidController.touchDown = function (elementId, x, y, cb) {
  var opts = {};
  if (elementId) opts.elementId = elementId;
  if (x) opts.x = x;
  if (y) opts.y = y;
  this.proxy(["element:touchDown", opts], cb);
};

androidController.touchUp = function (elementId, x, y, cb) {
  var opts = {};
  if (elementId) opts.elementId = elementId;
  if (x) opts.x = x;
  if (y) opts.y = y;
  this.proxy(["element:touchUp", opts], cb);
};

androidController.touchMove = function (elementId, x, y, cb) {
  var opts = {};
  if (elementId) opts.elementId = elementId;
  if (x) opts.x = x;
  if (y) opts.y = y;
  this.proxy(["element:touchMove", opts], cb);
};

androidController.fireEvent = function (evt, elementId, value, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getStrings = function (cb) {
  this.proxy(["getStrings"], cb);
};

androidController.complexTap = function (tapCount, touchCount, duration, x, y, elementId, cb) {
  this.proxy(["click", {x: x, y: y}], cb);
};

androidController.clear = function (elementId, cb) {
  this.proxy(["element:clear", {elementId: elementId}], cb);
};

androidController.submit = function (elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getName = function (elementId, cb) {
  var p = {elementId: elementId, attribute: "className"};
  this.proxy(["element:getAttribute", p], cb);
};

androidController.getText = function (elementId, cb) {
  this.proxy(["element:getText", {elementId: elementId}], cb);
};

androidController.getAttribute = function (elementId, attributeName, cb) {
  var p = {elementId: elementId, attribute: attributeName};
  this.proxy(["element:getAttribute", p], cb);
};

androidController.getLocation = function (elementId, cb) {
  this.proxy(["element:getLocation", {elementId: elementId}], cb);
};

androidController.getSize = function (elementId, cb) {
  this.proxy(["element:getSize", {elementId: elementId}], cb);
};

androidController.getWindowSize = function (windowHandle, cb) {
  this.proxy(["getDeviceSize"], cb);
};

androidController.back = function (cb) {
  this.proxy(["pressBack"], cb);
};

androidController.forward = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.refresh = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getPageIndex = function (elementId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.keys = function (elementId, keys, cb) {
  this.proxy(["element:setText", {elementId: elementId, text: keys}], cb);
};

androidController.frame = function (frame, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.leaveWebView = function (cb) {
  warnDeprecated('function', 'leaveWebView', 'context(null)');
  this.setWindow(this.defaultContext(), cb);
};

androidController.implicitWait = function (ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.info("Set Android implicit wait to " + ms + "ms");
  cb(null, {
    status: status.codes.Success.code
  , value: null
  });
};

androidController.asyncScriptTimeout = function (ms, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.executeAsync = function (script, args, responseUrl, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.elementDisplayed = function (elementId, cb) {
  var p = {elementId: elementId, attribute: "displayed"};
  this.proxy(["element:getAttribute", p], function (err, res) {
    if (err) return cb(err);
    var displayed = res.value === 'true';
    cb(null, {
      status: status.codes.Success.code
    , value: displayed
    });
  });
};

androidController.elementEnabled = function (elementId, cb) {
  var p = {elementId: elementId, attribute: "enabled"};
  this.proxy(["element:getAttribute", p], function (err, res) {
    if (err) return cb(err);
    var enabled = res.value === 'true';
    cb(null, {
      status: status.codes.Success.code
    , value: enabled
    });
  });
};

androidController.elementSelected = function (elementId, cb) {
  var p = {elementId: elementId, attribute: "selected"};
  this.proxy(["element:getAttribute", p], function (err, res) {
    if (err) return cb(err);
    var selected = res.value === 'true';
    cb(null, {
      status: status.codes.Success.code
    , value: selected
    });
  });
};

androidController.getCssProperty = function (elementId, propertyName, cb) {
  cb(new NotYetImplementedError(), null);
};

var _updateSourceXMLNodeNames = function (source) {
  var newSource;
  var origDom = new XMLDom.DOMParser().parseFromString(source);
  var newDom = new XMLDom.DOMImplementation().createDocument(null);
  _buildClassNodeFromPlainNode(newDom, newDom, origDom);
  newSource = new XMLDom.XMLSerializer().serializeToString(newDom);
  return newSource;
};

var _getNodeClass = function (node) {
  var nodeClass = null;
  _.each(node.attributes, function (attr) {
    if (attr.name === "class") {
      nodeClass = attr.value;
    }
  });
  return nodeClass;
};

var _copyNodeAttributes = function (oldNode, newNode) {
  _.each(oldNode.attributes, function (attr) {
    newNode.setAttribute(attr.name, attr.value);
  });
};

var _buildClassNodeFromPlainNode = function (newDom, newParent, oldNode) {
  var newNode;
  var nodeClass = _getNodeClass(oldNode);
  if (nodeClass) {
    newNode = newDom.createElement(nodeClass);
    _copyNodeAttributes(oldNode, newNode);
  } else {
    newNode = oldNode.cloneNode(false);
  }
  newParent.appendChild(newNode);
  if (oldNode.hasChildNodes()) {
    _.each(oldNode.childNodes, function (childNode) {
      _buildClassNodeFromPlainNode(newDom, newNode, childNode);
    });
  }
};

androidController.getPageSource = function (cb) {
  var xmlFile = temp.path({suffix: '.xml'});
  var jsonFile = xmlFile + '.json';
  var json = '';
  var onDeviceXmlPath = this.dataDir + '/local/tmp/dump.xml';
  async.series(
    [
      function (cb) {
        this.proxy(["dumpWindowHierarchy"], cb);
      }.bind(this),
      function (cb) {
        var cmd = this.adb.adbCmd + ' pull ' + onDeviceXmlPath + ' "' + xmlFile + '"';
        logger.debug('transferPageSource command: ' + cmd);
        exec(cmd, { maxBuffer: 524288 }, function (err, stdout, stderr) {
          if (err) {
            logger.warn(stderr);
            return cb(err);
          }
          cb(null);
        });
      }.bind(this),
      function (cb) {
        var jar = path.resolve(__dirname, 'helpers', 'dump2json.jar');
        var cmd = 'java -jar "' + jar + '" "' + xmlFile + '"';
        logger.debug('json command: ' + cmd);
        exec(cmd, { maxBuffer: 524288 }, function (err, stdout, stderr) {
          if (err) {
            logger.warn(stderr);
            return cb(err);
          }
          cb(null);
        });
      },
      function (cb) {
        json = fs.readFileSync(jsonFile, 'utf8');
        fs.unlinkSync(jsonFile);
        fs.unlinkSync(xmlFile);
        cb(null);
      }
    ],
    // Top level cb
    function () {
      warnDeprecatedCustom('page source', 'json',
        "You got the source of the app using the page source command. This " +
        "command is undergoing a large change which will be released in " +
        "Appium 1.0. The change will include returning an XML document " +
        "instead of a JSON object. If you depend on the page source command " +
        "you should try the new version, which is accessible by doing " +
        "`driver.execute_script('mobile: source', [{type: 'xml'}])`, or " +
        "the equivalent in your language bindings.");
      cb(null, {
        status: status.codes.Success.code
      , value: json
      });
    });
};

androidController.getPageSourceXML = function (cb) {
  var xmlFile = temp.path({suffix: '.xml'});
  async.series(
    [
      function (cb) {
        var cmd = this.adb.adbCmd + ' shell uiautomator dump /data/local/tmp/dump.xml';
        logger.debug('getPageSourceXML command: ' + cmd);
        exec(cmd, { maxBuffer: 524288 }, function (err, stdout, stderr) {
          if (err) {
            logger.warn(stderr);
            return cb(err);
          }
          cb(null);
        });
      }.bind(this),
      function (cb) {
        var cmd = this.adb.adbCmd + ' pull /data/local/tmp/dump.xml "' + xmlFile + '"';
        logger.debug('transferPageSourceXML command: ' + cmd);
        exec(cmd, { maxBuffer: 524288 }, function (err, stdout, stderr) {
          if (err) {
            logger.warn(stderr);
            return cb(err);
          }
          cb(null);
        });
      }.bind(this)

    ],
    // Top level cb
    function () {
      var xml = fs.readFileSync(xmlFile, 'utf8');
      fs.unlinkSync(xmlFile);
      try {
        xml = _updateSourceXMLNodeNames(xml);
      } catch (e) {
        logger.error(e);
        return cb(e);
      }
      cb(null, {
        status: status.codes.Success.code
      , value: xml
      });
    });
};

androidController.waitForPageLoad = function (timeout, cb) {
  this.proxy(["waitForIdle", {timeout: timeout}], cb);
};

androidController.getAlertText = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setAlertText = function (text, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.postAcceptAlert = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.postDismissAlert = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.lock = function (secs, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getOrientation = function (cb) {
  this.proxy(["orientation", {}], cb);
};

androidController.setOrientation = function (orientation, cb) {
  this.proxy(["orientation", {orientation: orientation}], cb);
};

androidController.endCoverage = function (intentToBroadcast, ecOnDevicePath, cb) {
  var localfile = temp.path({prefix: 'appium', suffix: '.ec'});
  if (fs.existsSync(localfile)) fs.unlinkSync(localfile);
  var b64data = "";

  async.series([
    function (cb) {
      // ensure the ec we're pulling is newly created as a result of the intent.
      this.adb.rimraf(ecOnDevicePath, function () { cb(); });
    }.bind(this),
    function (cb) {
      this.adb.broadcastProcessEnd(intentToBroadcast, this.appProcess, cb);
    }.bind(this),
    function (cb) {
      this.adb.pull(ecOnDevicePath, localfile, cb);
    }.bind(this),
    function (cb) {
      fs.readFile(localfile, function (err, data) {
        if (err) return cb(err);
        b64data = new Buffer(data).toString('base64');
        cb();
      });
    }.bind(this),
  ],
  function (err) {
    if (fs.existsSync(localfile)) fs.unlinkSync(localfile);
    if (err) return cb(err);
    cb(null, {
      status: status.codes.Success.code
    , value: b64data
    });
  });
};

androidController.localScreenshot = function (file, cb) {
  async.series([
    function (cb) {
      this.proxy(["takeScreenshot"], cb);
    }.bind(this),
    function (cb) {
      this.adb.pull('/data/local/tmp/screenshot.png', file, cb);
    }.bind(this),
  ],
  function (err) {
    if (err) return cb(err);
    cb(null, {
      status: status.codes.Success.code
    });
  });
};

androidController.pullFile = function (remotePath, cb) {
  var localFile = temp.path({prefix: 'appium', suffix: '.tmp'});
  var b64data = "";

  async.series([
    function (cb) {
      this.adb.pull(remotePath, localFile, cb);
    }.bind(this),
    function (cb) {
      fs.readFile(localFile, function (err, data) {
        if (err) return cb(err);
        b64data = new Buffer(data).toString('base64');
        cb();
      });
    }.bind(this),
  ],
    function (err) {
      if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
      if (err) return cb(err);
      cb(null, {
        status: status.codes.Success.code
      , value: b64data
      });
    });
};

androidController.pushFile = function (base64Data, remotePath, cb) {
  var localFile = temp.path({prefix: 'appium', suffix: '.tmp'});
  mkdirp.sync(path.dirname(localFile));

  async.series([
    function (cb) {
      var content = new Buffer(base64Data, 'base64');
      var fd = fs.openSync(localFile, 'w');
      fs.writeSync(fd, content, 0, content.length, 0);
      fs.closeSync(fd);

      // adb push creates folders and overwrites existing files.
      this.adb.push(localFile, remotePath, cb);
    }.bind(this),
  ],
    function (err) {
      if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
      if (err) return cb(err);
      cb(null, {
        status: status.codes.Success.code
      });
    });
};

androidController.getScreenshot = function (cb) {
  var localfile = temp.path({prefix: 'appium', suffix: '.png'});
  var b64data = "";

  async.series([
    function (cb) {
      var png = "/data/local/tmp/screenshot.png";
      var cmd =  ['"/system/bin/rm', png + ';', '/system/bin/screencap -p',
                  png, '"'].join(' ');
      this.adb.shell(cmd, cb);
    }.bind(this),
    function (cb) {
      if (fs.existsSync(localfile)) fs.unlinkSync(localfile);
      this.adb.pull('/data/local/tmp/screenshot.png', localfile, cb);
    }.bind(this),
    function (cb) {
      fs.readFile(localfile, function (err, data) {
        if (err) return cb(err);
        b64data = new Buffer(data).toString('base64');
        cb();
      });
    },
    function (cb) {
      fs.unlink(localfile, function (err) {
        if (err) return cb(err);
        cb();
      });
    }
  ],
  // Top level cb
  function (err) {
    if (err) return cb(err);
    cb(null, {
      status: status.codes.Success.code
    , value: b64data
    });
  });
};

androidController.fakeFlick = function (xSpeed, ySpeed, swipe, cb) {
  this.proxy(["flick", {xSpeed: xSpeed, ySpeed: ySpeed}], cb);
};

androidController.fakeFlickElement = function (elementId, xoffset, yoffset, speed, cb) {
  this.proxy(["element:flick", {xoffset: xoffset, yoffset: yoffset, speed: speed, elementId: elementId}], cb);
};

androidController.swipe = function (startX, startY, endX, endY, duration, touchCount, elId, cb) {
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

androidController.rotate = function (x, y, radius, rotation, duration, touchCount, elId, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.pinchClose = function (startX, startY, endX, endY, duration, percent, steps, elId, cb) {
  var pinchOpts = {
    direction: 'in'
  , elementId: elId
  , percent: percent
  , steps: steps
  };
  this.proxy(["element:pinch", pinchOpts], cb);
};

androidController.pinchOpen = function (startX, startY, endX, endY, duration, percent, steps, elId, cb) {
  var pinchOpts = {
    direction: 'out'
  , elementId: elId
  , percent: percent
  , steps: steps
  };
  this.proxy(["element:pinch", pinchOpts], cb);
};

androidController.flick = function (startX, startY, endX, endY, touchCount, elId, cb) {
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

androidController.drag = function (startX, startY, endX, endY, duration, touchCount, elementId, destElId, cb) {
  var dragOpts = {
    elementId: elementId
  , destElId: destElId
  , startX: startX
  , startY: startY
  , endX: endX
  , endY: endY
  , steps: Math.round(duration * this.dragStepsPerSec)
  };

  if (elementId !== null) {
    this.proxy(["element:drag", dragOpts], cb);
  } else {
    this.proxy(["drag", dragOpts], cb);
  }
};

androidController.scrollTo = function (elementId, text, direction, cb) {
  // instead of the elementId as the element to be scrolled too,
  // it's the scrollable view to swipe until the uiobject that has the
  // text is found.
  var opts = {
    text: text
  , direction: direction
  , elementId: elementId
  };
  this.proxy(["element:scrollTo", opts], cb);
};

androidController.scroll = function (direction, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.shake = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setLocation = function (latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, course, speed, cb) {
  var cmd = "geo fix " + longitude + " " + latitude;
  this.adb.sendTelnetCommand(cmd, function (err, res) {
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

androidController.hideKeyboard = function (keyName, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.url = function (url, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.active = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getCurrentContext = function (cb) {
  var response = {
    status: status.codes.Success.code
  , value: this.curContext || null
  };
  cb(null, response);
};

androidController.getContexts = function (cb) {
  this.listWebviews(function (err, webviews) {
    if (err) return cb(err);
    this.contexts = [NATIVE_WIN];
    var idx = 0;
    _.each(webviews, function (view, idx) {
      this.contexts.push(WEBVIEW_BASE + (idx + 1).toString());
    }.bind(this));
    logger.info("Available contexts: " + this.contexts);
    cb(null, {
      status: status.codes.Success.code
    , value: this.contexts
    });
  }.bind(this));
};

androidController.setContext = function (name, cb) {
  if (name === null) {
    name = this.defaultContext();
  } else if (name === WEBVIEW_WIN) {
    name = WEBVIEW_BASE + "1";
  }
  this.getContexts(function () {
    if (!_.contains(this.contexts, name)) {
      return cb(null, {
        status: status.codes.NoSuchContext.code
      , value: "Context '" + name + "' does not exist"
      });
    }
    if (name === this.curContext) {
      return jwpSuccess(cb);
    }
    var next = function (err) {
      if (err) return cb(err);
      this.curContext = name;
      jwpSuccess(cb);
    }.bind(this);

    // current ChromeDriver doesn't handle more than a single web view
    if (name.indexOf(WEBVIEW_WIN) !== -1) {
      this.startChromedriverProxy(next);
    } else {
      this.stopChromedriverProxy(next);
    }
  }.bind(this));
};

// TODO: remove in appium 1.0
androidController.getWindowHandle = function (cb) {
  warnDeprecated('function', 'getWindowHandle', 'getCurrentContext()');
  jwpSuccess(this.curContext, cb);
};

// TODO: remove in appium 1.0
androidController.getWindowHandles = function (cb) {
  warnDeprecated('function', 'getWindowHandles', 'getContexts()');
  this.listWebviews(function (err, webviews) {
    if (err) return cb(err);
    if (webviews.length) {
      this.contexts = [NATIVE_WIN, WEBVIEW_WIN];
    } else {
      this.contexts = [NATIVE_WIN];
    }
    jwpSuccess(this.contexts, cb);
  }.bind(this));
};

// TODO: remove in appium 1.0
androidController.setWindow = function (name, cb) {
  warnDeprecated('function', 'setWindow', 'setContext(name)');
  this.getWindowHandles(function () {
    if (!_.contains(this.contexts, name)) {
      return cb(null, {
        status: status.codes.NoSuchWindow.code
      , value: "That window doesn't exist"
      });
    }
    if (name === this.curContext) {
      return cb();
    }
    var next = function (err) {
      if (err) return cb(err);
      this.curContext = name;
      jwpSuccess(cb);
    }.bind(this);
    if (name === WEBVIEW_WIN) {
      this.startChromedriverProxy(next);
    } else {
      this.stopChromedriverProxy(next);
    }
  }.bind(this));
};

androidController.closeWindow = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.clearWebView = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.execute = function (script, args, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.convertElementForAtoms = deviceCommon.convertElementForAtoms;

androidController.title = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.moveTo = function (element, xoffset, yoffset, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.clickCurrent = function (button, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.getCookies = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.setCookie = function (cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.deleteCookie = function (cookie, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.deleteCookies = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.resetAndStartApp = function (cb) {
  async.series([
    this.resetApp.bind(this),
    this.waitForActivityToStop.bind(this),
    this.startApp.bind(this)
  ], cb);
};

// controller.js#isAppInstalled expects weird response, hence this hack
androidController.isAppInstalled = function (appPackage, cb) {
  this.adb.isAppInstalled(appPackage, function (err, installed) {
    if (installed) {
      return cb(null, [true]);
    }
    cb(err, []);
  });
};

androidController.removeApp = function (appPackage, cb) {
  var removeCommand = null;
  if (this.args.udid) {
    removeCommand = 'adb -s ' + this.args.udid + ' uninstall ' + appPackage;
  } else {
    removeCommand = 'adb uninstall ' + appPackage;
  }
  deviceCommon.removeApp(removeCommand, this.args.udid, appPackage, cb);
};

androidController.installApp = function (appPackage, cb) {
  var installationCommand = null;
  if (this.args.udid) {
    installationCommand = 'adb -s ' + this.args.udid + ' install ' + appPackage;
  } else {
    installationCommand = 'adb install ' + appPackage;
  }
  deviceCommon.installApp(installationCommand, this.args.udid, appPackage, cb);
};

androidController.unpackApp = function (req, cb) {
  deviceCommon.unpackApp(req, '.apk', cb);
};

module.exports = androidController;
