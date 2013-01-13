var http = require('http')
  , url = require('url')
  , express = require('express')
  , app = express()
  , path = require('path')
  , server = http.createServer(app)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , spawn = require('child_process').spawn
  , build = require('./build')
  , instruments = require('./instruments');

app.configure(function() {
  app.use(express.bodyParser());
  app.use(app.router);
});

app.listen(4723, 'localhost', function() {
  console.log("Appium server running");
});

var appRoot = path.resolve(__dirname, '../sample-code/apps/TestApp/');
var simApp = path.resolve(appRoot, 'build/Release-iphonesimulator/TestApp.app');

build(appRoot, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log("Launching instruments...");
  var inst = instruments(
    app
    , simApp
    , null
    , path.resolve(__dirname, 'bootstrap_example.js')
    , path.resolve(__dirname, '../app/uiauto/Automation.tracetemplate')
  );

  inst.launch(function() {
    console.log('done launching');
    inst.sendCommand("application.bundleID()", function(bundleId) {
      console.log("Bundle ID is " + bundleId);
      inst.sendCommand("mainWindow.textFields()[0].setValue('3');", function() {
        inst.sendCommand("mainWindow.textFields()[1].setValue('5');", function() {
          inst.sendCommand("mainWindow.buttons()[0].tap();", function() {
            inst.sendCommand("mainWindow.staticTexts()[0].value()", function(sum) {
              console.log("Sum should be 8 and is " + sum);
              //process.exit(0);
            });
          });
        });
      });
    });
  }, function(code) {
    process.exit(code);
  });
});
