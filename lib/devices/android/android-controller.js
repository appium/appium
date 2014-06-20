"use strict";

var errors = require('../../server/errors.js')
  , _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , deviceCommon = require('../common.js')
  , helpers = require('../../helpers.js')
  , status = require('../../server/status.js')
  , NotYetImplementedError = errors.NotYetImplementedError
  , exec = require('child_process').exec
  , fs = require('fs')
  , temp = require('temp')
  , async = require('async')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , xpath = require("xpath")
  , XMLDom = require("xmldom")
  , AdmZip = require("adm-zip")
  , helpers = require('../../helpers.js')
  , Args = require("vargs").Constructor;

var androidController = {};

androidController.pressKeyCode = function (keycode, metastate, cb) {
  this.proxy(["pressKeyCode", {keycode: keycode, metastate: metastate}], cb);
};

androidController.longPressKeyCode = function (keycode, metastate, cb) {
  this.proxy(["longPressKeyCode", {keycode: keycode, metastate: metastate}], cb);
};

androidController.keyevent = function (keycode, metastate, cb) {
  helpers.logDeprecationWarning('function', 'keyevent', 'pressKeyCode');
  this.pressKeyCode(keycode, metastate, cb);
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
  if (strategy === "xpath" && context) {
    return cb(new Error("Cannot use xpath locator strategy from an element. " +
                        "It can only be used from the root element"));
  }
  var params = {
    strategy: strategy
  , selector: selector
  , context: context
  , multiple: many
  };

  var doFind = function (findCb) {
    if (strategy === "xpath") {
      this.findUIElementsByXPath(selector, many, function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    } else {
      this.proxy(["find", params], function (err, res) {
        this.handleFindCb(err, res, many, findCb);
      }.bind(this));
    }
  }.bind(this);
  this.waitForCondition(this.implicitWaitMs, doFind, cb);
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
  this.getPageSource(function (err, res) {
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

androidController.implicitWait = function (ms, cb) {
  this.implicitWaitMs = parseInt(ms, 10);
  logger.debug("Set Android implicit wait to " + ms + "ms");
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
  var onDeviceXmlPath = this.dataDir + '/local/tmp/dump.xml';
  async.series(
    [
      function (cb) {
        this.proxy(["dumpWindowHierarchy"], cb);
      }.bind(this),
      function (cb) {
        var cmd = this.adb.adbCmd + ' pull ' + onDeviceXmlPath + ' "' + xmlFile + '"';
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
    function (err) {
      if (err) return cb(err);
      var xml = '';
      if (fs.existsSync(xmlFile)) {
        xml = fs.readFileSync(xmlFile, 'utf8');
        fs.unlinkSync(xmlFile);
      }

      // xml file may not exist or it could be empty.
      if (xml === '') {
        var error = "dumpWindowHierarchy failed";
        logger.error(error);
        return cb(error);
      }

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

androidController.equalsWebElement = function (cb) {
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

androidController.pullFolder = function (remotePath, cb) {
  var localFolder = temp.path({prefix: 'appium'});

  var bufferOnSuccess = function (buffer) {
    logger.debug("Converting in-memory zip file to base64 encoded string");
    var data = buffer.toString('base64');
    logger.debug("Returning in-memory zip file as base54 encoded string");
    cb(null, {status: status.codes.Success.code, value: data});
  };

  var bufferOnFail = function (err) {
    cb(new Error(err));
  };

  this.adb.pull(remotePath, localFolder, function (err) {
    if (err) return cb(new Error(err));
    var zip = new AdmZip();
    zip.addLocalFolder(localFolder);
    zip.toBuffer(bufferOnSuccess, bufferOnFail);
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

androidController.hideKeyboard = function () {
  // parameters only used for iOS. Please ignore them for android.
  var args = new(Args)(arguments);
  var cb = args.callback;
  this.adb.isSoftKeyboardPresent(function (err, isKeyboardPresent) {
    if (err) return cb(err);
    if (isKeyboardPresent) {
      this.back(cb);
    } else {
      return cb(new Error("Soft keyboard not present, cannot hide keyboard"));
    }
  }.bind(this));
};

androidController.url = function (url, cb) {
  cb(new NotYetImplementedError(), null);
};

androidController.active = function (cb) {
  cb(new NotYetImplementedError(), null);
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

androidController.tap = function (elementId, x, y, count, cb) {
  if (typeof x === "undefined" || x === null) x = 0;
  if (typeof y === "undefined" || y === null) y = 0;
  if (typeof count === "undefined" || count === null) count = 1;

  var i = 0;
  var opts = {};
  var loop = function (err, res) {
    if (err) return cb(err);
    if (i++ >= count) return cb(err, res);

    this.proxy(opts, loop);
  }.bind(this);

  if (elementId) {
    // we are either tapping on the default location of the element
    // or an offset from the top left corner
    if (x !== 0 || y !== 0) {
      this.proxy(["element:getLocation", {elementId: elementId}], function (err, res) {
        if (err) return cb(err);
        var value = res.value;
        x += parseInt(value.x);
        y += parseInt(value.y);

        opts = ["click", {x: x, y: y}];
        loop();
      }.bind(this));
    } else {
      opts = ["element:click", {elementId: elementId}];
      loop();
    }
  } else {
    // we have absolute coordinates
    opts = ["click", {x: x, y: y}];
    loop();
  }
};

androidController.doTouchAction = function (action, opts, cb) {
  switch (action) {
    case 'tap':
      return this.tap(opts.element, opts.x, opts.y, opts.count, cb);
    case 'press':
      return this.touchDown(opts.element, opts.x, opts.y, cb);
    case 'release':
      return this.touchUp(opts.element, opts.x, opts.y, cb);
    case 'moveTo':
      return this.touchMove(opts.element, opts.x, opts.y, cb);
    case 'wait':
      return setTimeout(function () {
        cb(null, {"value": true, "status": status.codes.Success.code});
      }, opts.ms);
    case 'longPress':
      if (typeof opts.duration === 'undefined' || !opts.duration) {
        opts.duration = 1000;
      }
      return this.touchLongClick(opts.element, opts.x, opts.y, opts.duration, cb);
    case 'cancel':
      // TODO: clarify behavior of 'cancel' action and fix this
      logger.warn("Cancel action currently has no effect");
      break;
    default:
      return cb("unknown action '" + action + "'");
  }
};

// drag is *not* press-move-release, so we need to translate
// drag works fine for scroll, as well
var doTouchDrag = function (gestures, cb) {
  var longPress = gestures[0];
  var elementId = longPress.options.element;
  this.getLocation(elementId, function (err, res) {
    if (err) return cb(err);

    var startX = res.value.x;
    var startY = res.value.y;

    var moveTo = gestures[1];
    var destElId = moveTo.options.element;
    var endX = moveTo.options.x;
    var endY = moveTo.options.y;

    if (typeof destElId !== 'undefined' && destElId) {
      this.getLocation(destElId, function (err, res) {
        if (err) return cb(err);

        endX = res.value.x + (endX || 0);
        endY = res.value.y + (endY || 0);

        return this.drag(startX, startY, endX, endY, 1, 1, elementId, destElId, cb);
      }.bind(this));
    } else {
      return this.drag(startX, startY, endX, endY, 1, 1, elementId, destElId, cb);
    }
  }.bind(this));


  return;
};

androidController.performTouch = function (gestures, cb) {
  // some things are special
  var actions = _.pluck(gestures, "action");
  if (actions[0] === 'longPress' && actions[1] === 'moveTo' && actions[2] === 'release') {
    return doTouchDrag.apply(this, [gestures, cb]);
  } else if ((actions[actions.length - 2] === 'tap' ||
    actions[actions.length - 2] === 'longPress') && actions[actions.length - 1] === 'release') {
    // the `longPress` and `tap` methods release on their own
    gestures.pop();
  }
  var cycleThroughGestures = function (err, res) {
    if (err) return cb(err);

    var gesture = gestures.shift();
    if (typeof gesture === "undefined") return cb(null, res);

    var action = gesture.action;
    var options = gesture.options || {};

    this.doTouchAction(action, options, cycleThroughGestures);
  }.bind(this);
  cycleThroughGestures();
};

androidController.parseTouch = function (gestures, cb) {
  if (_.last(gestures).action === 'release') {
    gestures.pop();
  }

  var needsPoint = function (action) {
    return _.contains(['press', 'moveTo', 'tap', 'longPress'], action);
  };

  var touchStateObjects = [];
  async.eachSeries(gestures, function (gesture, done) {
    var tapPoint = false;
    if (needsPoint(gesture.action)) { // press, longPress, moveTo and tap all need a position
      var elementId = gesture.options.element;
      if (elementId) {
        this.getLocation(elementId, function (err, res) {
          if (err) return done(err); // short circuit and quit

          var pos = { x: res.value.x, y: res.value.y };
          this.getSize(elementId, function (err, res) {
            if (err) return done(err);
            var size = {w: res.value.width, h: res.value.height};

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
              timeOffset: 0.005,
              touch: tapPoint
            };
            touchStateObjects.push(touchStateObject);
            done();
          });
        }.bind(this));
      } else {
        // expects absolute coordinates, so we need to save these as offsets
        // and then translate when everything is done
        tapPoint = {
          offset: true,
          x: (gesture.options.x || 0),
          y: (gesture.options.y || 0)
        };

        touchStateObject = {
          timeOffset: 0.005,
          touch: tapPoint
        };
        touchStateObjects.push(touchStateObject);
        done();
      }
    } else {
      // in this case we need the previous entry's tap point
      tapPoint = false; // temporary marker
      var offset = 0.005;
      if (gesture.action === 'wait') {
        if (typeof gesture.options.ms !== 'undefined' || gesture.options.ms !== null) {
          offset = (parseInt(gesture.options.ms) / 1000);
        }
      }
      var touchStateObject = {
        timeOffset: offset,
        touch: tapPoint
      };
      touchStateObjects.push(touchStateObject);
      done();
    }
  }.bind(this), function (err) {
    if (err) return cb(err);

    // we need to change the time (which is now an offset)
    // and the position (which may be an offset)
    var prevPos = null,
        time = 0;
    _.each(touchStateObjects, function (state) {
      if (state.touch === false) {
        // if we have no position (this happens with `wait`) we need the previous one
        state.touch = prevPos;
      } else if (state.touch.offset && prevPos) {
        // the current position is an offset
        state.touch.x += prevPos.x;
        state.touch.y += prevPos.y;
      }
      delete state.touch.offset;
      prevPos = state.touch;

      var timeOffset = state.timeOffset;
      time += timeOffset;
      state.time = helpers.truncateDecimals(time, 3);

      delete state.timeOffset;
    });

    cb(null, touchStateObjects);
  });
};

androidController.performMultiAction = function (elementId, actions, cb) {
  // Android needs at least two actions to be able to perform a multi pointer gesture
  if (actions.length === 1) {
    return cb(new Error("Multi Pointer Gestures need at least two actions. " +
                        "Use Touch Actions for a single action."));
  }

  var states = [];
  async.eachSeries(actions, function (action, done) {
    this.parseTouch(action, function (err, val) {
      if (err) return done(err);

      states.push(val);
      done();
    }.bind(this));
  }.bind(this), function (err) {
    if (err) return cb(err);

    var opts;
    if (elementId) {
      opts = {
        elementId: elementId,
        actions: states
      };
      return this.proxy(["element:performMultiPointerGesture", opts], cb);
    } else {
      opts = {
        actions: states
      };
      return this.proxy(["performMultiPointerGesture", opts], cb);
    }
  }.bind(this));
};

androidController.openNotifications = function (cb) {
  this.proxy(["openNotification"], cb);
};

module.exports = androidController;
