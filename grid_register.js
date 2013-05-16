var http = require('http')
  , fs = require('fs')
  , logger = require('./logger').get('appium');

exports.registerNode = function (configFile) {
  fs.readFile(configFile, 'utf-8', function (err, data, cb) {
    if (err) {
      logger.error("Unable to load node configuration file to register with grid");
      cb("Unable to load node configuration file to register with grid");
      code = code || 1;
    }
    // Check presence of data before posting  it to the selenium grid
    if (data) {
      postRequest(data);
    }
    else {
      logger.error("No data found in the node configuration  file to send to the grid");
      cb("No data found in the node configuration  file to send to the grid");
      code = code || 1;
    }
  });
}

function postRequest(data) {
  //parse json to get hub host and port
  var jsonObject = JSON.parse(data);
  hubHost = jsonObject.configuration.hubHost;
  // prepare the header
  var postheaders = {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  };
  // the post options
  var optionspost = {
    host: jsonObject.configuration.hubHost,
    port: jsonObject.configuration.hubPort,
    path: '/grid/register',
    method: 'POST',
    headers: postheaders
  };
  // make the http POST to the grid for registration
  var reqPost = http.request(optionspost, function (res) {
    if (res.statusCode == 200) {
      var logMessage = "Appium successfully registered with the grid on " + jsonObject.configuration.hubHost + ":" + jsonObject.configuration.hubPort;
      logger.info(logMessage.cyan);
    } else {
      logger.err("Request to register with grid was Unsuccessful...");
    }
    res.setEncoding('utf-8');
    res.on('data', function (d) {
    });
  });
  // write the json data  to the request
  reqPost.write(data);
  reqPost.end();
  reqPost.on('error', function (e) {
  console.error(e);
  });
}






