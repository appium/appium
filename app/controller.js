// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py
"use strict";
var status = require('./uiauto/lib/status')
  , logger = require('../logger.js').get('appium')
  , _s = require("underscore.string")
  , _ = require('underscore');

function getResponseHandler(req, res) {
  var responseHandler = function(err, response) {
    if (typeof response === "undefined" || response === null) {
      response = {};
    }
    if (err !== null && typeof err !== "undefined") {
      if (typeof err.name !== 'undefined') {
        if (err.name == 'NotImplementedError') {
          notImplementedInThisContext(req, res);
        } else if (err.name == "NotYetImplementedError") {
          exports.notYetImplemented(req, res);
        }
      } else {
        var value = response.value;
        if (typeof value === "undefined") {
          value = '';
        }
        respondError(req, res, err.message, value);
      }
    } else {
      if (response.status === 0) {
        respondSuccess(req, res, response.value, response.sessionId);
      } else {
        respondError(req, res, response.status, response.value);
      }
    }
  };
  return responseHandler;
}

var getSessionId = function(req, response) {
  var sessionId = (typeof response == 'undefined') ? undefined : response.sessionId;
  if (typeof sessionId === "undefined") {
    if (req.appium) {
      sessionId = req.appium.sessionId || null;
    } else {
      sessionId = null;
    }
  }
  if (typeof sessionId !== "string" && sessionId !== null) {
    sessionId = null;
  }
  return sessionId;
};

var respondError = function(req, res, statusObj, value) {
  var code = 1, message = "An unknown error occurred";
  var newValue = value;
  if (typeof statusObj === "string") {
    message = statusObj;
  } else if (typeof statusObj === "undefined") {
    message = "undefined status object";
  } else if (typeof statusObj === "number") {
    code = statusObj;
    message = status.getSummaryByCode(code);
  } else if (typeof statusObj.code !== "undefined") {
    code = statusObj.code;
    message = statusObj.summary;
  } else if (typeof statusObj.message !== "undefined") {
    message = statusObj.message;
  }

  if (typeof newValue === "object") {
    newValue = _.extend({message: message}, value);
  }
  var response = {status: code, value: newValue};
  response.sessionId = getSessionId(req, response);
  logger.info("Responding to client with error: " + JSON.stringify(response));
  res.send(500, response);
};

var respondSuccess = function(req, res, value, sid) {
  var response = {status: status.codes.Success.code, value: value};
  response.sessionId = getSessionId(req, response) || sid;
  if (typeof response.value === "undefined") {
    response.value = '';
  }
  logger.info("Responding to client with success: " + JSON.stringify(response));
  res.send(response);
};

var checkMissingParams = function(res, params) {
  var missingParamNames = [];
  _.each(params, function(param, paramName) {
    if (typeof param === "undefined") {
      missingParamNames.push(paramName);
    }
  });
  if (missingParamNames.length > 0) {
    var missingList = JSON.stringify(missingParamNames);
    logger.info("Missing params for request: " + missingList);
    res.send(400, "Missing parameters: " + missingList);
    return false;
  } else {
    return true;
  }
};

exports.sessionBeforeFilter = function(req, res, next) {
  var match = new RegExp("([^/]+)").exec(req.params[0]);
  var sessId = match ? match[1] : null;
  // if we don't actually have a valid session, respond with an error
  if (sessId && (!req.device || req.appium.sessionId != sessId)) {
    res.send(404, {sessionId: null, status: status.codes.NoSuchDriver.code, value: ''});
  } else {
    next();
  }
};

exports.getStatus = function(req, res) {
  // Return a static JSON object to the client
  respondSuccess(req, res, {
    build: {version: 'Appium 1.0'}
  });
};

exports.createSession = function(req, res) {
  if (typeof req.body === 'string') {
    req.body = JSON.parse(req.body);
  }

  var desired = req.body.desiredCapabilities;

  var next = function(sessionId, device, preLaunched) {
    var redirect = function() {
      res.set('Location', "/wd/hub/session/" + sessionId);
      res.send(303);
    };
    if (desired && desired.newCommandTimeout) {
      device.setCommandTimeout(desired.newCommandTimeout, redirect);
    } else if (preLaunched) {
      // reset timeout to something more reasonable
      device.resetCommandTimeout(redirect);
    } else {
      redirect();
    }
  };
  if (req.appium.preLaunched && req.appium.sessionId) {
    req.appium.preLaunched = false;
    next(req.appium.sessionId, req.appium.device, true);
  } else {
    req.appium.start(req.body.desiredCapabilities, function(err, instance) {
      if (err) {
        logger.error("Failed to start an Appium session, err was: " + err);
        respondError(req, res, status.codes.NoSuchDriver, err);
      } else {
        logger.info("Appium session started with sessionId " + req.appium.sessionId);
        next(req.appium.sessionId, instance);
      }
    });
  }
};

exports.getSession = function(req, res) {
  // Return a static JSON object to the client
  respondSuccess(req, res, req.device.capabilities);
};

exports.getSessions = function(req, res) {
  respondSuccess(req, res,
      [{id: req.appium.sessionId , capabilities: req.device.capabilities}]);
};

exports.reset = function(req, res) {
  req.appium.reset(getResponseHandler(req, res));
};

exports.deleteSession = function(req, res) {
  req.appium.stop(getResponseHandler(req, res));
};

exports.findElements = function(req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  req.device.findElements(strategy, selector, getResponseHandler(req, res));
};

exports.findElement = function(req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  req.device.findElement(strategy, selector, getResponseHandler(req, res));
};

exports.findElementFromElement = function(req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementFromElement(element, strategy, selector, getResponseHandler(req, res));
};

exports.findElementsFromElement = function(req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementsFromElement(element, strategy, selector, getResponseHandler(req, res));
};

exports.setValue = function(req, res) {
  var elementId = req.params.elementId
    , value = req.body.value.join('');

  req.device.setValue(elementId, value, getResponseHandler(req, res));
};

exports.doClick = function(req, res) {
  var elementId = req.params.elementId;
  req.device.click(elementId, getResponseHandler(req, res));
};

exports.mobileTap = function(req, res) {
  req.body = _.defaults(req.body, {
    tapCount: 1
    , touchCount: 1
    , duration: 0.1
    , x: 0.5
    , y: 0.5
    , element: null
  });
  var tapCount = req.body.tapCount
    , touchCount = req.body.touchCount
    , duration = req.body.duration
    , element = req.body.element
    , x = req.body.x
    , y = req.body.y;

  req.device.complexTap(tapCount, touchCount, duration, x, y, element,
      getResponseHandler(req, res));
};

exports.mobileFlick = function(req, res) {
  var onElement = typeof req.body.element !== "undefined";
  req.body = _.defaults(req.body, {
    touchCount: 1
    , startX: onElement ? 0.5 : 'null'
    , startY: onElement ? 0.5 : 'null'
    , element: null
  });
  var touchCount = req.body.touchCount
    , element = req.body.element
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY;

  if(checkMissingParams(res, {endX: endX, endY: endY})) {
    req.device.flick(startX, startY, endX, endY, touchCount, element,
        getResponseHandler(req, res));
  }
};

exports.mobileSwipe = function(req, res) {
  var onElement = typeof req.body.element !== "undefined";
  req.body = _.defaults(req.body, {
    touchCount: 1
    , startX: onElement ? 0.5 : 'null'
    , startY: onElement ? 0.5 : 'null'
    , duration: 0.8
    , element: null
  });
  var touchCount = req.body.touchCount
    , element = req.body.element
    , duration = req.body.duration
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY;

  if(checkMissingParams(res, {endX: endX, endY: endY})) {
    req.device.swipe(startX, startY, endX, endY, duration, touchCount,
        element, getResponseHandler(req, res));
  }
};

exports.hideKeyboard = function(req, res) {
  var keyName = req.body.keyName;

  req.device.hideKeyboard(keyName, getResponseHandler(req, res));
};

exports.clear = function(req, res) {
  var elementId = req.params.elementId;
  req.device.clear(elementId, getResponseHandler(req, res));
};

exports.getText = function(req, res) {
  var elementId = req.params.elementId;

  req.device.getText(elementId, getResponseHandler(req, res));
};

exports.getAttribute = function(req, res) {
  var elementId = req.params.elementId
    , attributeName = req.params.name;

  req.device.getAttribute(elementId, attributeName, getResponseHandler(req, res));
};

exports.getLocation = function(req, res) {
  var elementId = req.params.elementId;

  req.device.getLocation(elementId, getResponseHandler(req, res));
};

exports.getSize = function(req, res) {
  var elementId = req.params.elementId;
  req.device.getSize(elementId, getResponseHandler(req, res));
};

exports.getWindowSize = function(req, res) {
  var windowHandle = req.params.windowhandle;
  req.device.getWindowSize(windowHandle, getResponseHandler(req, res));
};

exports.getPageIndex = function(req, res) {
  var elementId = req.params.elementId;
  req.device.getPageIndex(elementId, getResponseHandler(req, res));
};

exports.keys = function(req, res) {
  var elementId = req.params.elementId
    , keys = req.body.value.join('');

  req.device.keys(elementId, keys, getResponseHandler(req, res));
};

exports.frame = function(req, res) {
  var frame = req.body.id;

  if (frame === null) {
    req.device.clearWebView(getResponseHandler(req, res));
  } else {
    req.device.frame(frame, getResponseHandler(req, res));
  }
};

exports.elementDisplayed = function(req, res) {
  var elementId = req.params.elementId;
  req.device.elementDisplayed(elementId, getResponseHandler(req, res));
};

exports.elementEnabled = function(req, res) {
  var elementId = req.params.elementId;

  req.device.elementEnabled(elementId, getResponseHandler(req, res));
};

exports.getPageSource = function(req, res) {
  req.device.getPageSource(getResponseHandler(req, res));
};

exports.getAlertText = function(req, res) {
  req.device.getAlertText(getResponseHandler(req, res));
};

exports.postAcceptAlert = function(req, res) {
  req.device.postAcceptAlert(getResponseHandler(req, res));
};

exports.postDismissAlert = function(req, res) {
  req.device.postDismissAlert(getResponseHandler(req, res));
};

exports.implicitWait = function(req, res) {
  var ms = req.body.ms;
  req.device.implicitWait(ms, getResponseHandler(req, res));
};

exports.setOrientation = function(req, res) {
  var orientation = req.body.orientation;
  req.device.setOrientation(orientation, getResponseHandler(req, res));
};

exports.getOrientation = function(req, res) {
  req.device.getOrientation(getResponseHandler(req, res));
};

exports.getScreenshot = function(req, res) {
  req.device.getScreenshot(getResponseHandler(req, res));
};

exports.pickAFlickMethod = function(req, res) {
  if (typeof req.body.xSpeed !== "undefined" || typeof req.body.xspeed !== "undefined") {
    exports.flick(req, res);
  } else {
    exports.flickElement(req, res);
  }
};

exports.flick = function(req, res) {
  var swipe = req.body.swipe
    , xSpeed = req.body.xSpeed
    , ySpeed = req.body.ySpeed
    , element = req.body.element;

  if (typeof xSpeed === "undefined") {
    xSpeed = req.body.xspeed;
  }
  if (typeof ySpeed === "undefined") {
    ySpeed = req.body.yspeed;
  }

  if(checkMissingParams(res, {xSpeed: xSpeed, ySpeed: ySpeed})) {
    if (element) {
      exports.flickElement(req, res);
    } else {
      req.device.fakeFlick(xSpeed, ySpeed, swipe, getResponseHandler(req, res));
    }
  }
};

exports.flickElement = function(req, res) {
  var element = req.body.element
    , xoffset = req.body.xoffset
    , yoffset = req.body.yoffset
    , speed = req.body.speed;

  if(checkMissingParams(res, {element: element, xoffset: xoffset, yoffset: yoffset})) {
    req.device.fakeFlickElement(element, xoffset, yoffset, speed, getResponseHandler(req, res));
  }
};

exports.execute = function(req, res) {
  var script = req.body.script
    , args = req.body.args;

  if(checkMissingParams(res, {script: script, args: args})) {
    if (_s.startsWith(script, "mobile: ")) {
      var realCmd = script.replace("mobile: ", "");
      exports.executeMobileMethod(req, res, realCmd);
    } else {
      req.device.execute(script, args, getResponseHandler(req, res));
    }
  }
};

exports.executeMobileMethod = function(req, res, cmd) {
  var args = req.body.args
    , params = {};

  if (args.length) {
    if (args.length !== 1) {
      res.send(400, "Mobile methods only take one parameter, which is a " +
                    "hash of named parameters to send to the method");
    } else {
      params = args[0];
    }
  }

  if (_.has(mobileCmdMap, cmd)) {
    req.body = params;
    mobileCmdMap[cmd](req, res);
  } else {
    logger.info("Tried to execute non-existent mobile command '"+cmd+"'");
    exports.notYetImplemented(req, res);
  }
};

exports.title = function(req, res) {
  req.device.title(getResponseHandler(req, res));
};

exports.postUrl = function(req, res) {
  var url = req.body.url;

  if(checkMissingParams(res, {url: url})) {
    req.device.url(url, getResponseHandler(req, res));
  }
};

exports.getUrl = function(req, res) {
  req.device.getUrl(getResponseHandler(req, res));
};

exports.active = function(req, res) {
  req.device.active(getResponseHandler(req, res));
};

exports.getWindowHandle = function(req, res) {
  req.device.getWindowHandle(getResponseHandler(req, res));
};

exports.setWindow = function(req, res) {
  var name = req.body.name;

  if(checkMissingParams(res, {name: name})) {
    req.device.setWindow(name, getResponseHandler(req, res));
  }
};

exports.getWindowHandles = function(req, res) {
  req.device.getWindowHandles(getResponseHandler(req, res));
};

exports.setCommandTimeout = function(req, res) {
  var timeout = req.body.timeout;

  if(checkMissingParams(res, {timeout: timeout})) {
    timeout = parseInt(timeout, 10);
    req.device.setCommandTimeout(timeout, getResponseHandler(req, res));
  }
};

exports.getCommandTimeout = function(req, res) {
  req.device.getCommandTimeout(getResponseHandler(req, res));
};

exports.setValueImmediate = function(req, res) {
  var element = req.body.element
    , value = req.body.value;
  if (checkMissingParams(res, {element: element, value: value})) {
    req.device.setValueImmediate(element, value, getResponseHandler(req, res));
  }
};

exports.findAndAct = function(req, res) {
  var params = {
    strategy: req.body.strategy
    , selector: req.body.selector
    , index: req.body.index
    , action: req.body.action
    , actionParams: req.body.params
  };

  if (typeof params.action === "undefined") {
    params.action = "tap";
  }
  if (typeof params.index === "undefined") {
    params.index = 0;
  }
  params.index = parseInt(params.index, 10);
  if (typeof params.actionParams === "undefined") {
    params.actionParams = [];
  }
  if (checkMissingParams(res, params)) {
    req.device.findAndAct(params.strategy, params.selector, params.index,
        params.action, params.actionParams, getResponseHandler(req, res));
  }
};

exports.unknownCommand = function(req, res) {
  logger.info("Responding to client that we did not find a valid resource");
  res.set('Content-Type', 'text/plain');
  res.send(404, "That URL did not map to a valid JSONWP resource");
};

exports.notYetImplemented = function(req, res) {
  logger.info("Responding to client that a method is not implemented");
  res.send(501, {
    status: status.codes.UnknownError.code
    , sessionId: getSessionId(req)
    , value: "Not yet implemented. " +
             "Please help us: http://appium.io/get-involved.html"
  });
};

var notImplementedInThisContext = function(req, res) {
  logger.info("Responding to client that a method is not implemented " +
              "in this context");
  res.send(501, {
    status: status.codes.UnknownError.code
    , sessionId: getSessionId(req)
    , value: "Not implemented in this context, try switching " +
             "into or out of a web view"
  });
};

var mobileCmdMap = {
  'tap': exports.mobileTap
  , 'flick': exports.mobileFlick
  , 'swipe': exports.mobileSwipe
  , 'hideKeyboard': exports.hideKeyboard
  , 'setCommandTimeout': exports.setCommandTimeout
  , 'getCommandTimeout': exports.getCommandTimeout
  , 'findAndAct': exports.findAndAct
  , 'setValue' : exports.setValueImmediate
  , 'reset' : exports.reset
};

exports.produceError = function(req, res) {
  req.device.proxy("thisisnotvalidjs", getResponseHandler(req, res));
};

exports.crash = function() {
  throw new Error("We just tried to crash Appium!");
};
