"use strict";
var path = require('path')
  , rimraf = require('rimraf')
  , http = require('http')
  , exec = require('child_process').exec
  , gruntHelpers = require('./grunt-helpers.js')
  , startAppium = gruntHelpers.startAppium
  , authorize = gruntHelpers.authorize
  , tail = gruntHelpers.tail
  , build = gruntHelpers.build
  , runTestsWithServer = gruntHelpers.runTestsWithServer
  , fs = require('fs');

module.exports = function(grunt) {


  grunt.initConfig({
    lint: {
      all: ['*.js', 'app/*.js', 'app/test/unit/*.js', 'instruments/*.js', 'test/functional/*.js', 'test/unit/*.js', 'test/functional/appium/*.js', 'test/functional/testapp/*.js', 'test/functional/uicatalog/*.js', 'test/helpers/*.js']
    }
    , jshint: {
      all: {
        options: {
          laxcomma: true
          , es5: true
          , trailing: true
          , node: true
          , strict: true
        }
      }
    }
    , mochaTest: {
      unit: ['app/test/unit/*.js']
      , appiumutils: ['test/functional/appium/appiumutils.js']
    }
    , mochaTestWithServer: {
      TestApp: {
        functional: ['test/functional/testapp/*.js']
        , server: ['test/functional/appium/appium.js'
                   , 'test/functional/appium/jsonwp.js']
      }
      , UICatalog: {
        functional: ['test/functional/uicatalog/*.js']
      }
    }
    , mochaTestConfig: {
      options: {
        timeout: 60000,
        reporter: 'spec'
      }
    }
  });

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.registerTask('functional', "Run functional tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', log === "log", this.async());
  });
  grunt.registerTask('servertest', "Run functional server tests", function(log) {
    runTestsWithServer(grunt, 'TestApp', 'server', log === "log", this.async());
  });
  grunt.registerTask('test', 'lint buildApp:TestApp buildApp:UICatalog unit appiumutils functional servertest');
  grunt.registerTask('unit', 'mochaTest:unit');
  grunt.registerTask('appiumutils', 'mochaTest:appiumutils');
  grunt.registerTask('default', 'lint test');
  grunt.registerTask('appium', "Start the Appium server", function(appName) {
    if (typeof appName === "undefined") {
      appName = null;
    }
    startAppium(appName, true, function() {}, this.async());
  });
  grunt.registerTask('mobileSafari', "Start the Appium server with MobileSafari", function(version) {
    if (typeof version === "undefined") {
      version = "6.0";
    }
    var app = "/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator" + version + ".sdk/Applications/MobileSafari.app";
    startAppium(app, true, function() {}, this.async());
  });
  grunt.registerTask('downloadApp', "Download UICatalog", function() {
    var done = this.async();
    var appBasePath = path.resolve(__dirname, 'sample-code/apps');
    var appPath = path.resolve(appBasePath, 'UICatalog');
    var zipPath = path.resolve(appBasePath, 'UICatalog.zip');
    var UICatUrl = "http://developer.apple.com/library/ios/samplecode/UICatalog/UICatalog.zip";
    // clear out anything that's there
    try {
      fs.unlinkSync(zipPath);
    } catch(e) {}
    rimraf(appPath, function() {
      var file = fs.createWriteStream(zipPath);
      console.log("Downloading UI catalog into " + zipPath);
      http.get(UICatUrl, function(response) {
        response.pipe(file);
        response.on('end', function() {
          console.log("Download complete");
          exec("unzip UICatalog.zip", {cwd: appBasePath}, function() {
            console.log("Unzipped into " + appPath);
            done();
          });
        });
      });
    });
  });
  grunt.registerTask('buildApp', "Build the test app", function(appDir, sdk) {
    if(typeof sdk === "undefined") {
      sdk = "iphonesimulator6.1";
    }
    var done = this.async();
    var appRoot = path.resolve(__dirname, 'sample-code/apps/', appDir);
    build(appRoot, function(err) {
      if (err) {
        console.log(err);
        done(false);
      } else {
        done(true);
      }
    }, sdk);
  });
  grunt.registerTask('authorize', "Authorize developer", function() {
    authorize(grunt, this.async());
  });
  grunt.registerTask('log', "Tail appium.log", function() {
    tail(grunt, path.resolve(__dirname, "appium.log"), this.async());
  });
};
