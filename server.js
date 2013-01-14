var http = require('http')
  , url = require('url')
  , express = require('express')
  , rest = express()
  , path = require('path')
  , server = http.createServer(rest)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , appium = require('./app/appium')
  , parser = require('./app/parser');

var main = function(app, udid, verbose, port, address, doneCb) {
  if (typeof doneCb === "undefined") {
    doneCb = function() {};
  }
  rest.configure(function() {
    var bodyParser = express.bodyParser()
      , parserWrap = function(req, res, next) {
          // wd.js sends us http POSTs with empty body which will make bodyParser fail.
          if (parseInt(req.get('content-length'), 10) <= 0) {
            return next();
          }
          bodyParser(req, res, next);
        };

    rest.use(express.favicon());
    rest.use(express.static(path.join(__dirname, '/app/static')));
    rest.use(express.logger('dev'));
    rest.use(parserWrap);
    rest.use(express.methodOverride());
    rest.use(rest.router);
  });
  // Instantiate the appium instance
  var appiumServer = appium(app, udid, verbose);
  // Hook up REST http interface
  appiumServer.attachTo(rest);
  // Start the web server that receives all the commands
  server.listen(port, address, function() {
    var logMessage = "Appium REST http interface listener started on "+address+":"+port;
    console.log(logMessage.cyan);
  });
  server.on('close', doneCb);
};

if (require.main === module) {
  // Parse the command line arguments
  var args = parser().parseArgs();
  main(args.app, args.UDID, args.verbose, args.port, args.address);
}

module.exports.run = main;
