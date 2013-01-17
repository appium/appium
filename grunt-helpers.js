"use strict";

var _ = require("underscore")
  , Module = require("module")
  , server = require('./server.js')
  , Mocha = require("mocha");

module.exports.startAppium = function(appName, readyCb, doneCb) {
  var app = "sample-code/apps/"+appName+"/build/Release-iphonesimulator/"+appName+".app";
  return server.run({
    app: app
    , udid: null
    , verbose: true
    , port: 4723
    , address: '127.0.0.1'
    , remove: true }
    , readyCb
    , doneCb
  );
};

module.exports.runTestsWithServer = function(grunt, appName, testType, cb) {
  server = module.exports.startAppium(appName, function() {
    module.exports.runMochaTests(grunt, testType, function(passed) {
      server.close();
      cb(passed);
    });
  }, function() {
    console.log("Appium server exited");
  });
};

module.exports.runMochaTests = function(grunt, testType, cb) {
  // Clear all the files we can in the require cache in case we are run from watch.
  // NB. This is required to ensure that all tests are run and that all the modules under
  // test have been reloaded and are not in some kind of cached state
  for (var key in Module._cache) {
    if (Module._cache[key]) {
      delete Module._cache[key];
      if (Module._cache[key]) {
        grunt.fail.warn('Mocha grunt task: Could not delete from require cache:\n' + key);
      }
    } else {
      grunt.fail.warn('Mocha grunt task: Could not find key in require cache:\n' + key);
    }
  }

  // load the options if they are specified
  var options = grunt.config(['mochaTestConfig', testType, 'options']);
  if (typeof options !== 'object') {
    options = grunt.config(['mochaTestConfig', 'options']);
  }
  var fileConfig = grunt.config(['mochaTest']);
  var files = [];
  _.each(fileConfig, function(testFiles, testKey) {
    if (testType == "*" || testType == testKey) {
      files = files.concat(testFiles);
    }
  });

  // create a mocha instance with our options
  var mocha = new Mocha(options);

  // add files to mocha
  grunt.file.expandFiles(files).forEach(function(file) {
    mocha.addFile(file);
  });

  // run mocha asynchronously and catch errors!! (again, in case we are running this task in watch)
  try {
    mocha.run(function(failureCount) {
      cb(failureCount === 0);
    });
  } catch (e) {
    grunt.log.error('Mocha exploded!');
    grunt.log.error(e.stack);
    cb(false);
  }
};
