var http = require('http')
  , url = require('url')
  , express = require('express')
  , app = express()
  , path = require('path')
  , server = http.createServer(app)
  , ap = require('argparse').ArgumentParser
  , colors = require('colors')
  , spawn = require('child_process').spawn
  , instruments = require('./instruments');

app.configure(function() {
  app.use(app.router);
});

var build = function(appRoot, cb) {
  console.log("Building app...");
  var args = ['-sdk', 'iphonesimulator6.0'];
  var xcode = spawn('xcodebuild', args, {
    cwd: appRoot
  });
  var output = '';
  var collect = function(data) { output += data; };
  xcode.stdout.on('data', collect);
  xcode.stderr.on('data', collect);
  xcode.on('exit', function(code) {
    if (code == 0) {
      console.log("done");
      cb();
    } else {
      console.log("Failed building app");
      console.log(output);
    }
  });
};

var appRoot = path.resolve(__dirname, '../sample-code/apps/TestApp/');

build(appRoot, function() {
  var simApp = path.resolve(appRoot, 'build/Release-iphonesimulator/TestApp.app');
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
    inst.sendCommand("application.bundleID()", function(result) {
      console.log("Got result from instruments: " + result);
      process.exit(0);
    });
  }, function(code) {
    process.exit(code);
  });
});

app.listen(5678, 'localhost', function() {
  console.log("Appium server running");
});

