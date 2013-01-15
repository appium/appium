// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py
"use strict";

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
  var sessionId = req.params.sessionId;
  var appResponse = {
    sessionId: sessionId
    , status: 0
    , value: {
      version: '6.0'
      , webStorageEnabled: false
      , locationContextEnabled: false
      , browserName: 'iOS'
      , platform: 'MAC'
      , javascriptEnabled: true
      , databaseEnabled: false
      , takesScreenshot: false
    }
  };

  res.send(appResponse);
};

exports.deleteSession = function(req, res) {
  var sessionId = req.params.sessionId;
  req.appium.stop(function(err, instance) {
    var appResponse = {
      sessionId: sessionId
      , status: 0
      , value: {}
    };

    res.send(appResponse);
  });
};

exports.findElements = function(req, res) {
  var strategy = req.body.using
    , value = req.body.value;

  req.device.findElements(value, function(err, result) {
    res.send({
      sessionId: req.appium.sessionId
      , status: 0
      , value: result
    });
  });
};

exports.setValue = function(req, res) {
  var sessionId = req.params.sessionid
    , elementId = req.params.elementId
    , value = req.body.value.join('')
    , status = 0;

  req.device.setValue(elementId, value, function(err, result) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: ''
    });
  });
};

exports.doClick = function(req, res) {
  var sessionid = req.params.sessionid
    , elementId = req.params.elementId
    , status = 0;

  req.device.click(elementId, function(err, json) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: ''
    });
  });
};

exports.getText = function(req, res) {
  var sessionid = req.params.sessionid
    , elementId = req.params.elementId
    , status = 0;

  req.device.getText(elementId, function(err, result) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: result.toString()
    });
  });
};
