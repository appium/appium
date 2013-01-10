var http = require('http')
  , url = require('url')
  , router = require('router')
  , route = router()
  , colors = require('colors')
  , port = 1337;

// import the controller
var controller = require('./controller');

// define our routes, https://github.com/gett/router
route.get('/{base}', controller.blah);

// import a package that collected system reqs

// start the JSON wire protocol endpoint
http.createServer(route).listen(port);

// start the appium queue server

var logMessage = "Appium started on localhost:"+port;
console.log(logMessage.cyan);
