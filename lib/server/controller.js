// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py
"use strict";
var status = require('./status.js')
  , logger = require('./logger.js').get('appium')
  , _s = require("underscore.string")
  , swig = require('swig')
  , path = require('path')
  , version = require('../../package.json').version
  , proxy = require('./proxy.js')
  , responses = require('./responses.js')
  , getResponseHandler = responses.getResponseHandler
  , respondError = responses.respondError
  , respondSuccess = responses.respondSuccess
  , checkMissingParams = responses.checkMissingParams
  , notYetImplemented = responses.notYetImplemented
  , helpers = require('../helpers.js')
  , logDeprecationWarning = helpers.logDeprecationWarning
  , logCustomDeprecationWarning = helpers.logCustomDeprecationWarning
  , _ = require('underscore');


exports.getGlobalBeforeFilter = function (appium) {
  return function (req, res, next) {
    req.appium = appium;
    req.device = appium.device;
    logger.debug("Appium request initiated at " + req.url);
    if (typeof req.body === "object") {
      logger.debug("Request received with params: " + JSON.stringify(req.body));
    }
    if (proxy.shouldProxy(req)) {
      if (req.appium.commandTimeout) {
        // if we're proxying, we never get into the sessionBeforeFilter,
        // so let's make sure to reset the timeout on every request still
        req.appium.resetTimeout();
      }
      if (typeof req.device.translatePath !== "undefined") {
        req.device.translatePath(req);
      }
      proxy.doProxy(req, res, next);
    } else {
      next();
    }
  };
};

exports.sessionBeforeFilter = function (req, res, next) {
  var match = new RegExp("([^/]+)").exec(req.params[0]);
  var sessId = match ? match[1] : null;
  if (req.appium.commandTimeout) {
    req.appium.resetTimeout();
  }
  // if we don't actually have a valid session, respond with an error
  if (sessId && (!req.device || req.appium.sessionId !== sessId)) {
    res.send(404, {sessionId: null, status: status.codes.NoSuchDriver.code, value: ''});
  } else {
    next();
  }
};

exports.getStatus = function (req, res) {
  // Return a static JSON object to the client
  var gitSha = req.appium.serverConfig['git-sha'];
  var data = {build: {version: version}};
  if (typeof gitSha !== "undefined") {
    data.build.revision = gitSha;
  }
  respondSuccess(req, res, data);
};

exports.installApp = function (req, res) {
  var install = function (appPath) {
    req.device.installApp(appPath, function (error, response) {
      if (error !== null) {
        respondError(req, res, response);
      } else {
        respondSuccess(req, res, response);
      }
    });
  };
  if (typeof req.body.appPath !== "undefined") {
    req.device.unpackApp(req, function (unpackedAppPath) {
      if (unpackedAppPath === null) {
        respondError(req, res, 'Only a (zipped) app/apk files can be installed using this endpoint');
      } else {
        install(unpackedAppPath);
      }
    });
  } else if (typeof req.device.args.app !== "undefined") {
    install(req.device.args.app);
  } else {
    respondError(req, res, "No app defined (either through desired capabilities or as an argument)");
  }
};

exports.removeApp = function (req, res) {
  req.body.appId = req.body.appId || req.body.bundleId;
  if (checkMissingParams(res, {appId: req.body.appId}, true)) {
    req.device.removeApp(req.body.appId, function (error, response) {
      if (error !== null) {
        respondError(req, res, response);
      } else {
        respondSuccess(req, res, response);
      }
    });
  }
};

// TODO: fix this method so it expects a callback with a boolean value, not
// some weird stdout thing
exports.isAppInstalled = function (req, res) {
  if (checkMissingParams(res, {bundleId: req.body.bundleId}, true)) {
    req.device.isAppInstalled(req.body.bundleId, function (error, stdout) {
      if (error !== null) {
        respondSuccess(req, res, false);
      } else {
        if ((req.appium.args.udid && req.appium.args.udid.length === 40) || (typeof stdout[0] !== "undefined")) {
          respondSuccess(req, res, true);
        } else {
          respondSuccess(req, res, false);
        }
      }
    });
  }
};

exports.launchApp = function (req, res) {
  req.device.start(function () {
    respondSuccess(req, res, "Successfully launched the [" + req.device.args.app + "] app.");
  }, function () {
    respondError(req, res, "Unable to launch the  [" + req.device.args.app + "] app.");
  });
};

exports.closeApp = function (req, res) {
  req.device.stop(function () {
    respondSuccess(req, res, "Successfully closed the [" + req.device.args.app + "] app.");
  }, function () {
    respondError(req, res, "Something whent wront whilst closing the [" + req.device.args.app + "] app.");
  });
};

exports.createSession = function (req, res) {
  if (typeof req.body === 'string') {
    req.body = JSON.parse(req.body);
  }

  var next = function (reqHost, sessionId) {
    res.set('Location', "http://" + reqHost + "/wd/hub/session/" + sessionId);
    res.send(303);
  };
  if (req.appium.preLaunched && req.appium.sessionId) {
    req.appium.preLaunched = false;
    next(req.headers.host, req.appium.sessionId, req.appium.device, true);
  } else {
    req.appium.start(req.body.desiredCapabilities, function (err, instance) {
      if (err) {
        logger.error("Failed to start an Appium session, err was: " + err);
        logger.info(err.stack);
        delete err.stack;
        respondError(req, res, status.codes.SessionNotCreatedException, err);
      } else {
        logger.info("Appium session started with sessionId " + req.appium.sessionId);
        next(req.headers.host, req.appium.sessionId, instance);
      }
    });
  }
};

exports.getSession = function (req, res) {
  // Return a static JSON object to the client
  respondSuccess(req, res, req.device.capabilities);
};

exports.getSessions = function (req, res) {
  var sessions = [];
  if (req.appium.sessionId !== null) {
    sessions.push({
      id: req.appium.sessionId
    , capabilities: req.device.capabilities
    });
  }

  respondSuccess(req, res, sessions);
};

exports.reset = function (req, res) {
  req.appium.reset(getResponseHandler(req, res));
};

exports.lock = function (req, res) {
  var seconds = req.body.seconds;
  if (checkMissingParams(res, {seconds: seconds})) {
    req.device.lock(seconds, getResponseHandler(req, res));
  }
};

exports.background = function (req, res) {
  var seconds = req.body.seconds;
  if (checkMissingParams(res, {seconds: seconds})) {
    req.device.background(seconds, getResponseHandler(req, res));
  }
};

exports.deleteSession = function (req, res) {
  req.appium.stop(getResponseHandler(req, res));
};

exports.equalsElement = function (req, res) {
  var element = req.params.elementId
    , other = req.params.otherId;

  req.device.equalsWebElement(element, other, getResponseHandler(req, res));
};

exports.findElements = function (req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  if (checkMissingParams(res, {strategy: strategy, selector: selector}, true)) {
    req.device.findElements(strategy, selector, getResponseHandler(req, res));
  }
};

exports.findElement = function (req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  if (checkMissingParams(res, {strategy: strategy, selector: selector}, true)) {
    req.device.findElement(strategy, selector, getResponseHandler(req, res));
  }
};

exports.findElementFromElement = function (req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementFromElement(element, strategy, selector, getResponseHandler(req, res));
};

exports.findElementsFromElement = function (req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementsFromElement(element, strategy, selector, getResponseHandler(req, res));
};

exports.setValue = function (req, res) {
  var elementId = req.params.elementId
    , value = req.body.value.join('');

  req.device.setValue(elementId, value, getResponseHandler(req, res));
};

exports.performTouch = function (req, res) {
  // first, assume that we are getting and array of gestures
  var gestures = req.body;

  // some clients, like Python, send an object in which there is an `actions`
  // property that is the array of actions
  // if this is not an array (having a `shift` method) try to get the
  // actions from there
  if (typeof gestures.shift !== 'function') {
    gestures = gestures.actions;
  }

  // press-wait-moveTo-release is `swipe`, so use native method
  if (gestures.length === 4) {
    if ((gestures[0].action === 'press') && (gestures[1].action === 'wait') && (gestures[2].action === 'moveTo') && (gestures[3].action === 'release')) {
      var body = {
        startX: gestures[0].options.x,
        startY: gestures[0].options.y,
        endX: gestures[2].options.x,
        endY: gestures[2].options.y,
        duration: gestures[1].options.ms
      };
      req.body = body;
      return exports.mobileSwipe(req, res);
    }
  }

  req.device.performTouch(gestures, getResponseHandler(req, res));
};

exports.performMultiAction = function (req, res) {
  var elementId = req.body.elementId;
  var actions = req.body.actions;

  req.device.performMultiAction(elementId, actions, getResponseHandler(req, res));
};

exports.doClick = function (req, res) {
  var elementId = req.params.elementId || req.body.element;
  req.device.click(elementId, getResponseHandler(req, res));
};

exports.touchLongClick = function (req, res) {
  var element = req.body.element;
  var x = req.body.x;
  var y = req.body.y;
  var duration = req.body.duration;

  if (element && checkMissingParams(res, {element: element}, true)) {
    req.device.touchLongClick(element, x, y, duration, getResponseHandler(req, res));
  } else if (checkMissingParams(res, {x: x, y: y}, true)) {
    req.device.touchLongClick(element, x, y, duration, getResponseHandler(req, res));
  }
};

exports.touchDown = function (req, res) {
  var element = req.body.element;
  var x = req.body.x;
  var y = req.body.y;

  if (element && checkMissingParams(res, {element: element}, true)) {
    req.device.touchDown(element, x, y, getResponseHandler(req, res));
  } else if (checkMissingParams(res, {x: x, y: y}, true)) {
    req.device.touchDown(element, x, y, getResponseHandler(req, res));
  }
};

exports.touchUp = function (req, res) {
  var element = req.body.element;
  var x = req.body.x;
  var y = req.body.y;

  if (element && checkMissingParams(res, {element: element}, true)) {
    req.device.touchUp(element, x, y, getResponseHandler(req, res));
  } else if (checkMissingParams(res, {x: x, y: y}, true)) {
    req.device.touchUp(element, x, y, getResponseHandler(req, res));
  }
};

exports.touchMove = function (req, res) {
  var element = req.body.element;
  var x = req.body.x;
  var y = req.body.y;

  if (element && checkMissingParams(res, {element: element}, true)) {
    req.device.touchMove(element, x, y, getResponseHandler(req, res));
  } else if (checkMissingParams(res, {x: x, y: y}, true)) {
    req.device.touchMove(element, x, y, getResponseHandler(req, res));
  }
};

exports.fireEvent = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'fireEvent',
      "fireEvent will be removed in a future version of Appium");
  var elementId = req.body.element
    , evt = req.body.event;
  req.device.fireEvent(evt, elementId, getResponseHandler(req, res));
};

exports.mobileTap = function (req, res) {
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

  req.device.complexTap(tapCount, touchCount, duration, x, y, element, getResponseHandler(req, res));
};

exports.mobileFlick = function (req, res) {
  req.body = _.defaults(req.body, {
    touchCount: 1
  , startX: 0.5
  , startY: 0.5
  , endX: 0.5
  , endY: 0.5
  , element: null
  });
  var touchCount = req.body.touchCount
    , element = req.body.element
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY;

  req.device.flick(startX, startY, endX, endY, touchCount, element, getResponseHandler(req, res));
};

exports.mobileDrag = function (req, res) {
  req.body = _.defaults(req.body, {
    startX: 0.5
  , startY: 0.5
  , endX: 0.5
  , endY: 0.5
  , duration: 1
  , touchCount: 1
  , element: null
  , destEl: null
  });
  var touchCount = req.body.touchCount
    , element = req.body.element
    , destEl = req.body.destEl
    , duration = req.body.duration
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY;

  req.device.drag(startX, startY, endX, endY, duration, touchCount, element, destEl, getResponseHandler(req, res));
};

exports.mobileSource = function (req, res) {
  var type = req.body.type;

  if (checkMissingParams(res, {type: type})) {
    logDeprecationWarning('parameter', 'type');
    if (type.toLowerCase() === "xml") {
      req.device.getPageSourceXML(getResponseHandler(req, res));
    } else {
      req.device.getPageSource(getResponseHandler(req, res));
    }
  }
};

exports.find = function (req, res) {
  var strategy = "dynamic"
    , selector = req.body
    , all = selector && selector[0] && typeof selector[0] === "string" && selector[0].toLowerCase() === "all";

  if (all) {
    req.device.findElements(strategy, selector, getResponseHandler(req, res));
  } else {
    req.device.findElement(strategy, selector, getResponseHandler(req, res));
  }
};

exports.mobileSwipe = function (req, res) {
  req.body = _.defaults(req.body, {
    touchCount: 1
  , startX: 0.5
  , startY: 0.5
  , endX: 0.5
  , endY: 0.5
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

  req.device.swipe(startX, startY, endX, endY, duration, touchCount, element, getResponseHandler(req, res));
};

exports.mobileRotation = function (req, res) {
  req.body = _.defaults(req.body, {
    x: 0.5
  , y: 0.5
  , radius: 0.5
  , rotation: 3.14159265359
  , touchCount: 2
  , duration: 1
  , element: null
  });
  var element = req.body.element
    , duration = req.body.duration
    , x = req.body.x
    , y = req.body.y
    , radius = req.body.radius
    , touchCount = req.body.touchCount
    , rotation = req.body.rotation;

  req.device.rotate(x, y, radius, rotation, duration, touchCount, element, getResponseHandler(req, res));
};

exports.mobilePinchClose = function (req, res) {
  req.body = _.defaults(req.body, {
    startX: 0.5
  , startY: 0.5
  , endX: 0.5
  , endY: 0.5
  , duration: 0.8
  , percent: 200
  , steps: 50
  , element: null
  });
  var element = req.body.element
    , duration = req.body.duration
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY
    , percent = req.body.percent
    , steps = req.body.steps;

  req.device.pinchClose(startX, startY, endX, endY, duration, percent, steps, element, getResponseHandler(req, res));
};

exports.mobilePinchOpen = function (req, res) {
  req.body = _.defaults(req.body, {
    startX: 0.5
  , startY: 0.5
  , endX: 0.5
  , endY: 0.5
  , duration: 0.8
  , percent: 200
  , steps: 50
  , element: null
  });
  var element = req.body.element
    , duration = req.body.duration
    , startX = req.body.startX
    , startY = req.body.startY
    , endX = req.body.endX
    , endY = req.body.endY
    , percent = req.body.percent
    , steps = req.body.steps;

  req.device.pinchOpen(startX, startY, endX, endY, duration, percent, steps, element, getResponseHandler(req, res));
};

exports.mobileScrollTo = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'scrollTo',
      "scrollTo will be removed in a future version of appium");
  req.body = _.defaults(req.body, {
    element: null
  , text: null
  , direction: "vertical"
  });
  var element = req.body.element
    , text = req.body.text
    , direction = req.body.direction;

  req.device.scrollTo(element, text, direction, getResponseHandler(req, res));
};

exports.mobileScroll = function (req, res) {
  req.body = _.defaults(req.body, {
    element: null
  , direction: "down"
  });
  var direction = req.body.direction.toString().toLowerCase()
    , element = req.body.element;
  if (!_.contains(['up', 'left', 'right', 'down'], direction)) {
    return respondError(req, res, status.codes.UnknownCommand.code,
      new Error("Direction " + direction + " is not valid for scroll"));
  }

  req.device.scroll(element, direction, getResponseHandler(req, res));
};

exports.mobileShake = function (req, res) {
  req.device.shake(getResponseHandler(req, res));
};

exports.mobileSetLocation = function (req, res) {
  logCustomDeprecationWarning("mobile method", "mobile: location",
      "mobile: location is deprecated and will be removed");
  req.body = _.defaults(req.body, {
    latitude: null
  , longitude: null
  , altitude: null
  , horizontalAccuracy: null
  , verticalAccuracy: null
  , course: null
  , speed: null
  });
  var latitude = req.body.latitude
    , longitude = req.body.longitude
    , altitude = req.body.altitude
    , horizontalAccuracy = req.body.horizontalAccuracy
    , verticalAccuracy = req.body.verticalAccuracy
    , course = req.body.course
    , speed = req.body.speed;

  if (checkMissingParams(res, {latitude: latitude, longitude: longitude})) {
    req.device.setLocation(latitude, longitude, altitude, horizontalAccuracy,
      verticalAccuracy, course, speed, getResponseHandler(req, res));
  }
};

exports.hideKeyboard = function (req, res) {
  var keyName = req.body.keyName;

  req.device.hideKeyboard(keyName, getResponseHandler(req, res));
};

exports.clear = function (req, res) {
  var elementId = req.params.elementId;
  req.device.clear(elementId, getResponseHandler(req, res));
};

exports.getText = function (req, res) {
  var elementId = req.params.elementId;

  req.device.getText(elementId, getResponseHandler(req, res));
};

exports.getName = function (req, res) {
  var elementId = req.params.elementId;

  req.device.getName(elementId, getResponseHandler(req, res));
};

exports.getAttribute = function (req, res) {
  var elementId = req.params.elementId
    , attributeName = req.params.name;

  req.device.getAttribute(elementId, attributeName, getResponseHandler(req, res));
};

exports.getCssProperty = function (req, res) {
  var elementId = req.params.elementId
    , propertyName = req.params.propertyName;

  req.device.getCssProperty(elementId, propertyName, getResponseHandler(req, res));
};

exports.getLocation = function (req, res) {
  var elementId = req.params.elementId;
  req.device.getLocation(elementId, getResponseHandler(req, res));
};

exports.getSize = function (req, res) {
  var elementId = req.params.elementId;
  req.device.getSize(elementId, getResponseHandler(req, res));
};

exports.getWindowSize = function (req, res) {
  var windowHandle = req.params.windowhandle;
  req.device.getWindowSize(windowHandle, getResponseHandler(req, res));
};

exports.getPageIndex = function (req, res) {
  var elementId = req.params.elementId;
  req.device.getPageIndex(elementId, getResponseHandler(req, res));
};

exports.keyevent = function (req, res) {
  req.body = _.defaults(req.body, {
    keycode: null
  , metastate: null
  });
  var keycode = req.body.keycode
  , metastate = req.body.metastate;
  req.device.keyevent(keycode, metastate, getResponseHandler(req, res));
};

exports.back = function (req, res) {
  req.device.back(getResponseHandler(req, res));
};

exports.forward = function (req, res) {
  req.device.forward(getResponseHandler(req, res));
};

exports.refresh = function (req, res) {
  req.device.refresh(getResponseHandler(req, res));
};

exports.keys = function (req, res) {
  var keys = req.body.value.join('');

  req.device.keys(keys, getResponseHandler(req, res));
};

exports.frame = function (req, res) {
  var frame = req.body.id;

  req.device.frame(frame, getResponseHandler(req, res));
};

exports.leaveWebView = function (req, res) {
  req.device.leaveWebView(getResponseHandler(req, res));
};

exports.elementDisplayed = function (req, res) {
  var elementId = req.params.elementId;
  req.device.elementDisplayed(elementId, getResponseHandler(req, res));
};

exports.elementEnabled = function (req, res) {
  var elementId = req.params.elementId;

  req.device.elementEnabled(elementId, getResponseHandler(req, res));
};

exports.elementSelected = function (req, res) {
  var elementId = req.params.elementId;
  req.device.elementSelected(elementId, getResponseHandler(req, res));
};

exports.getPageSource = function (req, res) {
  req.device.getPageSource(getResponseHandler(req, res));
};

exports.waitForPageLoad = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'waitForPageLoad',
      "waitForPageLoad will be removed in a future version of Appium.");
  req.body = _.defaults(req.body, { timeout: 30 });
  var timeout = req.body.timeout;

  req.device.waitForPageLoad(timeout, getResponseHandler(req, res));
};

exports.getAlertText = function (req, res) {
  req.device.getAlertText(getResponseHandler(req, res));
};

exports.setAlertText = function (req, res) {
  var text = req.body.text;
  req.device.setAlertText(text, getResponseHandler(req, res));
};

exports.postAcceptAlert = function (req, res) {
  req.device.postAcceptAlert(getResponseHandler(req, res));
};

exports.postDismissAlert = function (req, res) {
  req.device.postDismissAlert(getResponseHandler(req, res));
};

exports.implicitWait = function (req, res) {
  var ms = req.body.ms;
  req.device.implicitWait(ms, getResponseHandler(req, res));
};

exports.asyncScriptTimeout = function (req, res) {
  var ms = req.body.ms;
  req.device.asyncScriptTimeout(ms, getResponseHandler(req, res));
};

exports.timeouts = function (req, res) {
  var timeoutType = req.body.type
    , ms = req.body.ms;
  if (checkMissingParams(res, {type: timeoutType, ms: ms})) {
    if (timeoutType === "implicit") {
      exports.implicitWait(req, res);
    } else if (timeoutType === "script") {
      exports.asyncScriptTimeout(req, res);
    } else if (timeoutType === "command") {
      var secs = parseInt(ms, 10) / 1000;
      req.appium.setCommandTimeout(secs, getResponseHandler(req, res));
    } else {
      respondError(req, res, status.codes.UnknownCommand.code,
        new Error("Invalid timeout '" + timeoutType + "'"));
    }
  }
};

exports.setOrientation = function (req, res) {
  var orientation = req.body.orientation;
  req.device.setOrientation(orientation, getResponseHandler(req, res));
};

exports.setLocation = function (req, res) {
  var latitude = req.body.latitude
    , longitude = req.body.longitude
    , altitude = req.body.altitude;
  req.device.setLocation(latitude, longitude, altitude, null, null, null, null, getResponseHandler(req, res));
};

exports.getOrientation = function (req, res) {
  req.device.getOrientation(getResponseHandler(req, res));
};

exports.getScreenshot = function (req, res) {
  req.device.getScreenshot(getResponseHandler(req, res));
};

exports.moveTo = function (req, res) {
  req.body = _.defaults(req.body, {
    xoffset: 0.5
  , yoffset: 0.5
  });
  var xoffset = req.body.xoffset
    , yoffset = req.body.yoffset
    , element = req.body.element;

  req.device.moveTo(element, xoffset, yoffset, getResponseHandler(req, res));
};

exports.clickCurrent = function (req, res) {
  var button = req.body.button || 0;
  req.device.clickCurrent(button, getResponseHandler(req, res));
};

exports.pickAFlickMethod = function (req, res) {
  if (typeof req.body.xSpeed !== "undefined" || typeof req.body.xspeed !== "undefined") {
    exports.flick(req, res);
  } else {
    exports.flickElement(req, res);
  }
};

exports.flick = function (req, res) {
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

  if (checkMissingParams(res, {xSpeed: xSpeed, ySpeed: ySpeed})) {
    if (element) {
      exports.flickElement(req, res);
    } else {
      req.device.fakeFlick(xSpeed, ySpeed, swipe, getResponseHandler(req, res));
    }
  }
};

exports.flickElement = function (req, res) {
  var element = req.body.element
    , xoffset = req.body.xoffset
    , yoffset = req.body.yoffset
    , speed = req.body.speed;

  if (checkMissingParams(res, {element: element, xoffset: xoffset, yoffset: yoffset})) {
    req.device.fakeFlickElement(element, xoffset, yoffset, speed, getResponseHandler(req, res));
  }
};

exports.execute = function (req, res) {
  var script = req.body.script
    , args = req.body.args;

  if (checkMissingParams(res, {script: script, args: args})) {
    if (_s.startsWith(script, "mobile: ")) {
      var realCmd = script.replace("mobile: ", "");
      exports.executeMobileMethod(req, res, realCmd);
    } else {
      req.device.execute(script, args, getResponseHandler(req, res));
    }
  }
};

exports.executeAsync = function (req, res) {
  var script = req.body.script
    , args = req.body.args
    , responseUrl = '';

  responseUrl += 'http://' + req.appium.args.address + ':' + req.appium.args.port;
  responseUrl += '/wd/hub/session/' + req.appium.sessionId + '/receive_async_response';

  if (checkMissingParams(res, {script: script, args: args})) {
    req.device.executeAsync(script, args, responseUrl, getResponseHandler(req, res));
  }
};

exports.executeMobileMethod = function (req, res, cmd) {
  var args = req.body.args
    , params = {};

  var suppMethods = req.device.mobileMethodsSupported;
  if (suppMethods && !_.contains(suppMethods, cmd)) {
    return respondError(req, res, status.codes.UnknownCommand.code,
      new Error("That device doesn't know how to respond to 'mobile: '" +
                cmd + "--it's probably not using Appium's API"));
  }

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
    logger.info("Tried to execute non-existent mobile command '" + cmd + "'");
    notYetImplemented(req, res);
  }
};

exports.title = function (req, res) {
  req.device.title(getResponseHandler(req, res));
};

exports.submit = function (req, res) {
  var elementId = req.params.elementId;
  req.device.submit(elementId, getResponseHandler(req, res));
};

exports.postUrl = function (req, res) {
  var url = req.body.url;

  if (checkMissingParams(res, {url: url})) {
    req.device.url(url, getResponseHandler(req, res));
  }
};

exports.getUrl = function (req, res) {
  req.device.getUrl(getResponseHandler(req, res));
};

exports.active = function (req, res) {
  req.device.active(getResponseHandler(req, res));
};

exports.setContext = function (req, res) {
  var name = req.body.name;

  if (checkMissingParams(res, {name: name})) {
    req.device.setContext(name, getResponseHandler(req, res));
  }
};

exports.getCurrentContext = function (req, res) {
  req.device.getCurrentContext(getResponseHandler(req, res));
};

exports.getContexts = function (req, res) {
  req.device.getContexts(getResponseHandler(req, res));
};

exports.getWindowHandle = function (req, res) {
  req.device.getWindowHandle(getResponseHandler(req, res));
};

exports.setWindow = function (req, res) {
  var name = req.body.name;

  if (checkMissingParams(res, {name: name})) {
    req.device.setWindow(name, getResponseHandler(req, res));
  }
};

exports.closeWindow = function (req, res) {
  req.device.closeWindow(getResponseHandler(req, res));
};

exports.getWindowHandles = function (req, res) {
  req.device.getWindowHandles(getResponseHandler(req, res));
};

exports.setCommandTimeout = function (req, res) {
  var timeout = req.body.timeout;

  if (checkMissingParams(res, {timeout: timeout})) {
    timeout = parseInt(timeout, 10);
    req.appium.setCommandTimeout(timeout, getResponseHandler(req, res));
  }
};

exports.getCommandTimeout = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'getCommandTimeout',
      "getCommandTimeout will be removed in a future version of appium");
  req.appium.getCommandTimeout(getResponseHandler(req, res));
};

exports.receiveAsyncResponse = function (req, res) {
  var asyncResponse = req.body;
  req.device.receiveAsyncResponse(asyncResponse);
  res.send(200, 'OK');
};

exports.setValueImmediate = function (req, res) {
  var element = req.body.element
    , value = req.body.value;
  if (checkMissingParams(res, {element: element, value: value})) {
    req.device.setValueImmediate(element, value, getResponseHandler(req, res));
  }
};

exports.findAndAct = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'findAndAct',
      "findAndAct will be removed in a future version of appium");
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

exports.getCookies = function (req, res) {
  req.device.getCookies(getResponseHandler(req, res));
};

exports.setCookie = function (req, res) {
  var cookie = req.body.cookie;
  if (checkMissingParams(res, {cookie: cookie})) {
    if (typeof cookie.name !== "string" || typeof cookie.value !== "string") {
      return respondError(req, res, status.codes.UnknownError,
          "setCookie requires cookie of form {name: 'xxx', value: 'yyy'}");
    }
    req.device.setCookie(cookie, getResponseHandler(req, res));
  }
};

exports.deleteCookie = function (req, res) {
  var cookie = req.params.name;
  req.device.deleteCookie(cookie, getResponseHandler(req, res));
};

exports.deleteCookies = function (req, res) {
  req.device.deleteCookies(getResponseHandler(req, res));
};

exports.getCurrentActivity = function (req, res) {
  req.device.getCurrentActivity(getResponseHandler(req, res));
};

// mobile :findElementNameContains, name: 'sign in'
exports.findElementNameContains = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'findElementNameContains',
      "findElementNameContains is deprecated. Please use the -ios " +
      "uiautomator locator strategy instead");
  var name = req.body.name;

  if (checkMissingParams(res, {name: name})) {
    req.device.findElementNameContains(name, getResponseHandler(req, res));
  }
};

exports.getLog = function (req, res) {
  var logType = req.body.type;

  if (checkMissingParams(res, {logType: logType})) {
    req.device.getLog(logType, getResponseHandler(req, res));
  }
};

exports.getLogTypes = function (req, res) {
  req.device.getLogTypes(getResponseHandler(req, res));
};

exports.getStrings = function (req, res) {
  req.device.getStrings(getResponseHandler(req, res));
};

exports.unknownCommand = function (req, res) {
  logger.info("Responding to client that we did not find a valid resource");
  res.set('Content-Type', 'text/plain');
  res.send(404, "That URL did not map to a valid JSONWP resource");
};

exports.localScreenshot = function (req, res) {
  logCustomDeprecationWarning('mobile method', 'localScreenshot',
      "localScreenshot will be removed in a future version of appium");
  var file = req.body.file;

  if (checkMissingParams(res, {file: file})) {
    req.device.localScreenshot(file, getResponseHandler(req, res));
  }
};

exports.pushFile = function (req, res) {
  var data = req.body.data; // base64 data
  var path = req.body.path; // remote path

  if (checkMissingParams(res, {data: data, path: path})) {
    req.device.pushFile(data, path, getResponseHandler(req, res));
  }
};

exports.pullFile = function (req, res) {
  var path = req.body.path; // remote path

  if (checkMissingParams(res, {path: path})) {
    req.device.pullFile(path, getResponseHandler(req, res));
  }
};

exports.endCoverage = function (req, res) {
  var intent = req.body.intent;
  var path = req.body.path;

  if (checkMissingParams(res, {intent: intent, path: path})) {
    req.device.endCoverage(intent, path, getResponseHandler(req, res));
  }
};

exports.toggleData = function (req, res) {
  req.device.toggleData(getResponseHandler(req, res));
};

exports.toggleFlightMode = function (req, res) {
  req.device.toggleFlightMode(getResponseHandler(req, res));
};

exports.toggleWiFi = function (req, res) {
  req.device.toggleWiFi(getResponseHandler(req, res));
};

exports.toggleLocationServices = function (req, res) {
  req.device.toggleLocationServices(getResponseHandler(req, res));
};

exports.notYetImplemented = notYetImplemented;
var mobileCmdMap = {
  'tap': exports.mobileTap
, 'drag': exports.mobileDrag
, 'flick': exports.mobileFlick
, 'swipe': exports.mobileSwipe
, 'scrollTo': exports.mobileScrollTo
, 'scroll': exports.mobileScroll
, 'shake': exports.mobileShake
, 'setLocation' : exports.mobileSetLocation
, 'hideKeyboard': exports.hideKeyboard
, 'setCommandTimeout': exports.setCommandTimeout
, 'getCommandTimeout': exports.getCommandTimeout
, 'findAndAct': exports.findAndAct
, 'setValue' : exports.setValueImmediate
, 'reset' : exports.reset
, 'lock' : exports.lock
, 'background' : exports.background
, 'keyevent' : exports.keyevent
, 'leaveWebView': exports.leaveWebView
, 'fireEvent': exports.fireEvent
, 'source': exports.mobileSource
, 'find': exports.find
, 'waitForPageLoad': exports.waitForPageLoad
, 'currentActivity': exports.getCurrentActivity
, 'findElementNameContains': exports.findElementNameContains
, 'installApp': exports.installApp
, 'removeApp': exports.removeApp
, 'isAppInstalled': exports.isAppInstalled
, 'launchApp': exports.launchApp
, 'closeApp': exports.closeApp
, 'rotate': exports.mobileRotation
, 'longClick' : exports.touchLongClick
, 'down' : exports.touchDown
, 'up' : exports.touchUp
, 'move' : exports.touchMove
, 'pinchClose': exports.mobilePinchClose
, 'pinchOpen': exports.mobilePinchOpen
, 'localScreenshot': exports.localScreenshot
, 'getStrings': exports.getStrings
, 'toggleData': exports.toggleData
, 'toggleFlightMode': exports.toggleFlightMode
, 'toggleWiFi': exports.toggleWiFi
, 'toggleLocationServices': exports.toggleLocationServices
, 'endCoverage': exports.endCoverage
, 'pushFile': exports.pushFile
, 'pullFile': exports.pullFile
};

exports.produceError = function (req, res) {
  req.device.proxy("thisisnotvalidjs", getResponseHandler(req, res));
};

exports.crash = function () {
  throw new Error("We just tried to crash Appium!");
};

exports.guineaPig = function (req, res) {
  var params = {
    serverTime: parseInt(new Date().getTime() / 1000, 10)
  , userAgent: req.headers['user-agent']
  , comment: "None"
  };
  if (req.method === "POST") {
    params.comment = req.body.comments || params.comment;
  }
  res.set('Content-Type', 'text/html');
  res.cookie('guineacookie1', 'i am a cookie value', {path: '/'});
  res.cookie('guineacookie2', 'cookié2', {path: '/'});
  res.cookie('guineacookie3', 'cant access this', {
    domain: '.blargimarg.com',
    path: '/'
  });
  res.send(exports.getTemplate('guinea-pig')(params));
};

exports.getTemplate = function (templateName) {
  return swig.compileFile(path.resolve(__dirname, "templates",
        templateName + ".html"));
};
