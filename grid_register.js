"use strict";
var request = require('request')
  , fs = require('fs')
  , logger = require('./logger').get('appium');

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
      logger.error("No data found in the node configuration  file to send to the grid");
    }
  });
};

function postRequest(data) {
  //parse json to get hub host and port
  var jsonObject = JSON.parse(data);
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
  // make the http POST to the grid for registration
  var reqPost = request(options_post, function (error, response, body) {
    if (error !== null || response.statusCode !== 200) {
      logger.error("Request to register with grid was Unsuccessful...");
    } else {
      var logMessage = "Appium successfully registered with the grid on " + jsonObject.configuration.hubHost + ":" + jsonObject.configuration.hubPort;
      logger.info(logMessage.cyan);
    }
  });
}






