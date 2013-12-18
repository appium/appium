"use strict";
var request = require('request')
  , fs = require('fs')
  , logger = require('./logger.js').get('appium');

exports.registerNode = function (configFile) {
  fs.readFile(configFile, 'utf-8', function (err, data) {
    if (err) {
      logger.error("Unable to load node configuration file to register with grid");
      return;
    }
    // Check presence of data before posting  it to the selenium grid
    if (data) {
      postRequest(data);
    } else {
      logger.error("No data found in the node configuration file to send to the grid");
    }
  });
};

function registerToGrid(options_post, jsonObject) {
  var reqPost = request(options_post, function(error, response, body) {
    if (error !== null || response.statusCode !== 200) {
      logger.error("Request to register with grid was Unsuccessful...");
    } else {
      var logMessage = "Appium successfully registered with the grid on " + jsonObject.configuration.hubHost + ":" + jsonObject.configuration.hubPort;
      logger.info(logMessage);
    }
  });
}

function postRequest(data) {
  //parse json to get hub host and port
  var jsonObject;
  try {
    jsonObject = JSON.parse(data);
  } catch(e) {
    return logger.error("Syntax error in node configuration file: " + e.message);
  }
  // prepare the header
  var post_headers = {
    'Content-Type'  : 'application/json'
    , 'Content-Length': data.length
  };
  // the post options
  var options_post = {
    url       : 'http://' + jsonObject.configuration.hubHost + ':' + jsonObject.configuration.hubPort + '/grid/register'
    , method  : 'POST'
    , body    : data
    , headers : post_headers
  };

  if (jsonObject.configuration.register !== true) {
    logger.info("no registration sent ( " + jsonObject.configuration.register + " = false )");
  } else {
    var registerCycleTime = jsonObject.configuration.registerCycle;
    if (registerCycleTime !== null && registerCycleTime > 0) {
      //initiate a new Thread
      var first = true;
      logger.info("starting auto register thread for grid. Will try to register every " + registerCycleTime + " ms.");
      setInterval(function() {
        if (first !== true) {
          isAlreadyRegistered(jsonObject, function(isRegistered) {
            if (isRegistered !== null && isRegistered !== true) {
              // make the http POST to the grid for registration
              registerToGrid(options_post, jsonObject);
            }
          });
        } else {
          first = false;
          registerToGrid(options_post, jsonObject);
        }
      }, registerCycleTime);

    }
  }
}

function isAlreadyRegistered(jsonObject, cb) {
  //check if node is already registered
  var id = "http://" + jsonObject.configuration.host + ":" + jsonObject.configuration.port;
  request ({
    uri       : 'http://' + jsonObject.configuration.hubHost + ':' + jsonObject.configuration.hubPort + '/grid/api/proxy'+ "?id=" + id
    , method  : "GET"
    , timeout : 10000
  }, function(error, response, body) {
    if (error !== null || response === undefined || response.statusCode !== 200) {
      logger.info("hub down or not responding.");
      return cb(null);
    }
    var responseData = JSON.parse(response.body);
    return cb(responseData.success);
  });

}






