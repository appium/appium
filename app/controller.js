// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py

exports.status = function(req, res) {
  // Build a JSON object to return to the client
  var status = {
    sessionId: session.sessionId || null
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
  session.client.start();
  session.started = true;
  res.redirect("/wd/hub/session/"+session.sessionId);
};

exports.getSession = function(req, res) {
  var sessionId = req.params.sessionId;
  var appResponse = {
    status: 0
    , value: {
      version: '5.0'
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
  session.client.stop();
  session.started = false;
  var appResponse = {
    sessionId: sessionId
    , status: 0
    , value: {}  
  };

  req.send(appResponse);
};

exports.executeScript = function(req, res) {
  var sessionId = req.params.sessionId;
  var status = 0;
  var iosResponse ='';
  var requestData = req.body;
  try {
    iosResponse = session.client.proxy(requestData.script, true);
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
