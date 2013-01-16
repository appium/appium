"use strict";
var server = require('./server.js')
  , build = require('./build.js')
  , path = require('path')
  , rimraf = require('rimraf')
  , http = require('http')
  , exec = require('child_process').exec
  , fs = require('fs');

module.exports = function(grunt) {
  grunt.initConfig({
    lint: {
      all: ['*.js', 'app/*.js', 'app/test/unit/*.js', 'instruments/*.js']
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
      functional: ['test/functional/*.js']
      , unit: ['app/test/unit/*.js']
    }
    , mochaTestConfig: {
      options: {
        timeout: 60000
      }
    }
  });

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.registerTask('test', 'buildApp:TestApp mochaTest:*');
  grunt.registerTask('functional', 'buildApp mochaTest:functional');
  grunt.registerTask('unit', 'mochaTest:unit');
  grunt.registerTask('default', 'lint test');
  grunt.registerTask('appium', "Start the Appium server", function(appName) {
    if (typeof appName === "undefined") {
      appName = "TestApp";
    }
    var done = this.async();
    var app = "sample-code/apps/"+appName+"/build/Release-iphonesimulator/"+appName+".app";
    server.run({
      app: app
      , udid: null
      , verbose: true
      , port: 4723
      , address: '127.0.0.1'
      , remove: true }
      , function() {}
      , done
    );
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
  grunt.registerTask('buildApp', "Build the test app", function(appDir) {
    var done = this.async();
    var appRoot = path.resolve(__dirname, 'sample-code/apps/', appDir);
    build(appRoot, function(err) {
      if (err) {
        console.log(err);
        done(false);
      } else {
        done(true);
      }
    });
  });
};
