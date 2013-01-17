"use strict";

var _ = require("underscore")
  , server = require('./server.js')
  , fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn;

module.exports.startAppium = function(appName, verbose, readyCb, doneCb) {
  var app = (fs.existsSync(appName)) ? appName:
    path.resolve(__dirname,
      "./sample-code/apps/"+appName+"/build/Release-iphonesimulator/"+appName+".app");
  return server.run({
    app: app
    , udid: null
    , verbose: verbose
    , port: 4723
    , address: '127.0.0.1'
    , remove: true }
    , readyCb
    , doneCb
  );
};

module.exports.runTestsWithServer = function(grunt, appName, testType, verbose, cb) {
  if (typeof verbose === "undefined") {
      verbose = false;
  }
  var exitCode = null;
  server = module.exports.startAppium(appName, verbose, function() {
    module.exports.runMochaTests(grunt, testType, function(code) {
      server.close();
      exitCode = code;
    });
  }, function() {
    console.log("Appium server exited");
    cb(exitCode === 0);
  });
};

module.exports.runMochaTests = function(grunt, testType, cb) {

  // load the options if they are specified
  var options = grunt.config(['mochaTestConfig', testType, 'options']);
  if (typeof options !== 'object') {
    options = grunt.config(['mochaTestConfig', 'options']);
  }
  if (typeof options.timeout === "undefined") {
    options.timeout = 60000;
  }
  if (typeof options.reporter === "undefined") {
    options.reporter = "tap";
  }
  var args = ['-t', options.timeout, '-R', options.reporter, '--colors'];
  var fileConfig = grunt.config(['mochaTest']);
  _.each(fileConfig, function(testFiles, testKey) {
    if (testType == "*" || testType == testKey) {
      _.each(testFiles, function(file) {
        _.each(grunt.file.expandFiles(file), function(file) {
          args.push(file);
        });
      });
    }
  });

  var mochaProc = spawn('mocha', args, {cwd: __dirname});
  mochaProc.stdout.setEncoding('utf8');
  mochaProc.stderr.setEncoding('utf8');
  mochaProc.stdout.on('data', function(data) {
    grunt.log.write(data);
  });
  mochaProc.stderr.on('data', function(data) {
    grunt.log.write(data);
  });
  mochaProc.on('exit', function(code) {
    cb(code);
  });

};
