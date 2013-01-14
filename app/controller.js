// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py

var findElement = function(req, res, ctx, many, cb) {
  var strategy = req.body.using
    , value = req.body.value
    , ext = many ? 's' : '';

  var command = [ctx, ".findElement", ext, "AndSetKey", ext, "('", value, "')"].join("");

  req.appium.proxy(command, function(json) {
    json = many ? json : json[0];
    cb({
      sessionId: req.appium.sessionId
      , status: 0
      , value: json
    });
  });
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
  // we can talk to the appium client from here
  req.appium.start(function(err, instance) {
    if (err) {
      // of course we need to deal with err according to the WDJP spec.
      throw err;
    }

    res.redirect("/wd/hub/session/" + instance.sessionId);
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

exports.executeScript = function(req, res) {
  var sessionId = req.params.sessionId;
  var status = 0;
  var iosResponse ='';
  var requestData = req.body;
  try {
    iosResponse = appium.client.proxy(requestData.script, true);
  }
  catch (e) {
    var errObj = {sessionId: sessionId, 'status': 13, 'value': JSON.stringify(e)};
    req.send(400, errObj);
  }

  var appResponse = {
    sessionId: session_id
    , status: status
    , value: iosResponse
  };
  req.send(appResponse);
};

exports.findElements = function(req, res) {
  findElement(req, res, 'wd_frame', true, function(result) {
    res.send(result);
  });
};

exports.setValue = function(req, res) {
  var sessionid = req.params.sessionid
    , elementId = req.params.elementId
    , body = req.body.value.join('')
    , status = 0;

  var command = ["elements['", elementId, "'].setValue('", body, "')"].join('');

  req.appium.proxy(command, function(json) {
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

  var command = ["elements['", elementId, "'].tap()"].join('');

  req.appium.proxy(command, function(json) {
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

  var command = ["elements['", elementId, "'].getText()"].join('');

  req.appium.proxy(command, function(json) {
    res.send({
      sessionId: req.appium.sessionId
        , status: status
        , value: json.toString()
    });
  });
};
