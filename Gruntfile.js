"use strict";
var path = require('path')
  , gruntHelpers = require('./grunt-helpers.js')
  , startAppium = gruntHelpers.startAppium
  , authorize = gruntHelpers.authorize
  , downloadUICatalog = gruntHelpers.downloadUICatalog
  , tail = gruntHelpers.tail
  , buildApp = gruntHelpers.buildApp
  , signApp = gruntHelpers.signApp
  , runTestsWithServer = gruntHelpers.runTestsWithServer;

module.exports = function(grunt) {


  grunt.initConfig({
    jshint: {
      all: ['*.js', 'app/*.js', 'app/test/unit/*.js', 'instruments/*.js', 'test/functional/*.js', 'test/unit/*.js', 'test/functional/appium/*.js', 'test/functional/testapp/*.js', 'test/functional/uicatalog/*.js', 'test/helpers/*.js', 'app/uiauto/appium/app.js', 'app/uiauto/appium/binding.js', 'app/uiauto/element.js', 'app/uiauto/appium/utility.js', 'app/uiauto/lib/instruments_client.js', 'app/uiauto/lib/status.js']
      , options: {
        laxcomma: true
        , es5: true
        , trailing: true
        , node: true
        , strict: true
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
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('lint', ['jshint']);
  grunt.registerTask('functional', "Run functional tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', log === "log", this.async());
  });
  grunt.registerTask('servertest', "Run functional server tests", function(log) {
    runTestsWithServer(grunt, 'TestApp', 'server', log === "log", this.async());
  });
  grunt.registerTask('test', ['jshint', 'buildApp:TestApp', 'buildApp:UICatalog', 'unit', 'appiumutils', 'functional', 'servertest']);
  grunt.registerTask('unit', 'mochaTest:unit');
  grunt.registerTask('appiumutils', 'mochaTest:appiumutils');
  grunt.registerTask('default', ['test']);
  grunt.registerTask('travis', ['jshint', 'unit']);
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
    downloadUICatalog(this.async());
  });
  grunt.registerTask('buildApp', "Build the test app", function(appDir, sdk) {
    buildApp(appDir, this.async(), sdk);
  });
  grunt.registerTask('signApp', "Sign the test app", function(certName) {
    signApp("TestApp", certName, this.async());
  });
  grunt.registerTask('authorize', "Authorize developer", function() {
    authorize(grunt, this.async());
  });
  grunt.registerTask('log', "Tail appium.log", function() {
    tail(grunt, path.resolve(__dirname, "appium.log"), this.async());
  });
};
