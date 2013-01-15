var http = require('http')
  , path = require('path')
  , spawn = require('child_process').spawn
  , build = require('../build')
  , fs = require('fs')
  , instruments = require('./instruments')
  , rimraf = require('rimraf');

var appRoot = path.resolve(__dirname, '../sample-code/apps/TestApp/');
var simApp = path.resolve(appRoot, 'build/Release-iphonesimulator/TestApp.app');

build(appRoot, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  console.log("Launching instruments...");
  var onLaunch = function(inst) {
    inst.setDebug(true);
    inst.sendCommand("mainWindow.textFields()[0].setValue('3');", function() {
      inst.sendCommand("mainWindow.textFields()[1].setValue('5');", function() {
        inst.sendCommand("mainWindow.buttons()[0].tap();", function() {
          inst.sendCommand("mainWindow.staticTexts()[0].value()", function(sum) {
            console.log("Sum should be 8 and is " + sum);
            inst.shutdown();
          });
        });
      });
    });
  };

  var onExit = function(code, traceDir) {
    console.log("Instruments exited " + (code == 0 ? "cleanly" : "with code " + code));
    if (traceDir) {
      rimraf(traceDir, function() {
        console.log("Deleted tracedir");
        process.kill(code);
      });
    } else {
      console.log("Could not delete tracedir");
      process.kill(code);
    }
  };

  var inst = instruments(
    simApp
    , null
    , path.resolve(__dirname, 'bootstrap.js')
    , path.resolve(__dirname, '../app/uiauto/Automation.tracetemplate')
    , '/tmp/instruments_sock'
    , onLaunch
    , onExit
  );
});
