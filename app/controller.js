// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py
"use strict";
var status = require('./status');

var respond = function(cb) {
};

exports.getStatus = function(req, res) {
  // Build a JSON object to return to the client
  var status = {
    sessionId: req.appium.sessionId || null
    , status: 0
    , value: {
        build: {
          version: 'Appium 1.0'
        }
      }
  };
  res.send(status);
};

exports.createSession = function(req, res) {
  // we can talk to the device client from here
  req.appium.start(function(err, instance) {
    if (err) {
      // of course we need to deal with err according to the WDJP spec.
      throw err;
    }

    res.redirect("/wd/hub/session/" + req.appium.sessionId);
  });
};

exports.getSession = function(req, res) {
  status.create(req.appium.sessionId, status.codes.Success, null, function(s) {
    s.capabilities = req.device.capabilities;
    res.send(s);
  });
};

exports.getSessions = function(req, res) {
  status.create(req.appium.sessionId, status.codes.Success, null, function(s) {
    s.capabilities = req.device.capabilities;
    res.send([s]);
  });
};

exports.deleteSession = function(req, res) {
  var sessionId = req.params.sessionId;
  req.appium.stop(function(err, instance) {
    status.create(sessionId, status.codes.Success, {}, function(s) {
      res.send(s);
    });

  });
};

exports.findElements = function(req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  req.device.findElements(strategy, selector, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.findElement = function(req, res) {
  var strategy = req.body.using
    , selector = req.body.value;

  req.device.findElement(strategy, selector, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.findElementFromElement = function(req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementFromElement(element, strategy, selector, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.findElementsFromElement = function(req, res) {
  var element = req.params.elementId
    , strategy = req.body.using
    , selector = req.body.value;

  req.device.findElementsFromElement(element, strategy, selector, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.setValue = function(req, res) {
  var elementId = req.params.elementId
    , value = req.body.value.join('');

  req.device.setValue(elementId, value, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
      res.send(s);
    });
  });
};

exports.doClick = function(req, res) {
  var elementId = req.params.elementId;

  req.device.click(elementId, function(err, json) {
    status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
      res.send(s);
    });
  });
};

exports.clear = function(req, res) {
  var elementId = req.params.elementId
    , status = 0;

  req.device.clear(elementId, function(err, json) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: ''
    });
  });
};

exports.getText = function(req, res) {
  var elementId = req.params.elementId;

  req.device.getText(elementId, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result.toString(), function(s) {
      res.send(s);
    });
  });
};

exports.getAttribute = function(req, res) {
  var elementId = req.params.elementId
    , attributeName = req.params.name
    , status = 0;

  req.device.getAttribute(elementId, attributeName, function(err, result) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: result.toString()
    });
  });
};

exports.getLocation = function(req, res) {
  var elementId = req.params.elementId;

  req.device.getLocation(elementId, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.getSize = function(req, res) {
  var elementId = req.params.elementId;

  req.device.getSize(elementId, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.keys = function(req, res) {
  var elementId = req.params.elementId
    , keys = req.body.value.join('');

  req.device.keys(elementId, keys, function(err, json) {
    status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
      res.send(s);
    });
  });
};

exports.frame = function(req, res) {
  var frame = req.body.id;

  req.device.frame(frame, function(err, json) {
    status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
      res.send(s);
    });
  });
};

exports.elementDisplayed = function(req, res) {
  var elementId = req.params.elementId;

  req.device.elementDisplayed(elementId, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.elementEnabled = function(req, res) {
  var elementId = req.params.elementId;

  req.device.elementEnabled(elementId, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.getPageSource = function(req, res) {
  req.device.getPageSource(function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.getAlertText = function(req, res) {
  req.device.getAlertText(function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.postAcceptAlert = function(req, res) {
  req.device.postAcceptAlert(function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.postDismissAlert = function(req, res) {
  req.device.postDismissAlert(function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};

exports.implicitWait = function(req, res) {
  var seconds = req.body.ms / 1000;

  req.device.implicitWait(seconds, function(err, result) {
    var code = (err === null) ? status.codes.Success : status.codes.UnknownError;
    status.create(req.appium.sessionId, code, '', function(s) {
      res.send(s);
    });
  });
};

exports.setOrientation = function(req, res) {
  var orientation = req.body.orientation
    , status = 0;

  req.device.setOrientation(orientation, function(err, orientation) {
    status.create(req.appium.sessionId, status.codes.Success, orientation, function(s) {
      res.send(s);
    });
  });
};

exports.getOrientation = function(req, res) {
  req.device.getOrientation(function(err, orientation) {
    status.create(req.appium.sessionId, status.codes.Success, orientation, function(s) {
      res.send(s);
    });
  });
};

exports.getScreenshot = function(req, res) {
  req.device.getScreenshot(function(err, screenshot) {
    status.create(req.appium.sessionId, status.codes.Success, screenshot, function(s) {
      res.send(s);
    });
  });
};

exports.flick = function(req, res) {
  var swipe = req.body.swipe
    , xSpeed = req.body.xspeed
    , ySpeed = req.body.yspeed;

  req.device.flick(xSpeed, ySpeed, swipe, function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
      res.send(s);
    });
  });
};

exports.postUrl = function(req, res) {
  // in the future, detect whether we have a UIWebView that we can use to
  // make sense of this command. For now, and otherwise, it's a no-op
  status.create(req.appium.sessionId, status.codes.Success, '', function(s) {
    res.send(s);
  });
};

exports.active = function(req, res) {
  req.device.active(function(err, result) {
    status.create(req.appium.sessionId, status.codes.Success, result, function(s) {
      res.send(s);
    });
  });
};
