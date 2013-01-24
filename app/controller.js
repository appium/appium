// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py
"use strict";
var status = require('./uiauto/lib/status');

function getResponseHandler(req, res, validateResponse) {
  var responseHandler = function(err, response) {
    response.sessionId = req.appium.sessionId || response.sessionId || null;
    if (err !== null) {
      response.status = status.codes.UnknownError.code;
    } else {
      if (typeof(validateResponse) === 'function') {
        // If a validate method was provided, use it to update the response
        response = validateResponse(response);
      }
    }
    res.send(response);
  };
  return responseHandler;
}

exports.sessionBeforeFilter = function(req, res, next) {
  var match = new RegExp("([^/]+)").exec(req.params[0]);
  var sessId = match ? match[1] : null;
  // if we don't actually have a valid session, respond with an error
  if (sessId && (!req.device || req.appium.sessionId != sessId)) {
    res.send({sessionId: sessId, status: status.codes.NoSuchDriver, value: ''});
  } else {
    next();
  }
};

exports.getStatus = function(req, res) {
  // Return a static JSON object to the client
  getResponseHandler(req, res)(null, {
    status: status.codes.Success.code,
    value: {
      build: {version: 'Appium 1.0'}
    }});
};

exports.createSession = function(req, res) {
  // we can talk to the device client from here
  var desired = req.body.desiredCapabilities;
  req.appium.start(req.body.desiredCapabilities, function(err, instance) {
    if (err) {
      // of course we need to deal with err according to the WDJP spec.
      throw err;
    }

    if (desired && desired.newCommandTimeout) {
      instance.setCommandTimeout(desired.newCommandTimeout, function() {
        res.redirect("/wd/hub/session/" + req.appium.sessionId);
      });
    } else {
      res.redirect("/wd/hub/session/" + req.appium.sessionId);
    }
  });
};

exports.getSession = function(req, res) {
  // Return a static JSON object to the client
  getResponseHandler(req, res)(null, {
    status: status.codes.Success.code,
    value: req.device.capabilities
  });
};

exports.getSessions = function(req, res) {
  res.send([{id: req.appium.sessionId , capabilities: req.device.capabilities}]);
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

exports.keys = function(req, res) {
  var elementId = req.params.elementId
    , keys = req.body.value.join('');

  req.device.keys(elementId, keys, getResponseHandler(req, res));
};

exports.frame = function(req, res) {
  var frame = req.body.id;

  req.device.frame(frame, getResponseHandler(req, res));
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
  var seconds = req.body.ms / 1000;

  req.device.implicitWait(seconds, getResponseHandler(req, res));
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

exports.flick = function(req, res) {
  var swipe = req.body.swipe
    , xSpeed = req.body.xSpeed
    , ySpeed = req.body.ySpeed
    , element = req.body.element;

  if (element) {
    exports.flickElement(req, res);
  } else {
    req.device.flick(xSpeed, ySpeed, swipe, getResponseHandler(req, res));
  }
};

exports.flickElement = function(req, res) {
  var element = req.body.element
    , xoffset = req.body.xoffset
    , yoffset = req.body.yoffset
    , speed = req.body.speed;

  req.device.flickElement(element, xoffset, yoffset, speed, getResponseHandler(req, res));
};

exports.postUrl = function(req, res) {
  req.device.url(getResponseHandler(req, res));
};

exports.active = function(req, res) {
  req.device.active(getResponseHandler(req, res));
};
