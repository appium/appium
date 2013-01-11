// Appium webserver controller methods
// https://github.com/hugs/appium/blob/master/appium/server.py

exports.status = function(req, res) {
  // we can talk to the appium client from here
  session.client.start();

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
