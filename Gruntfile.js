"use strict";
var path = require('path')
  , gruntHelpers = require('./grunt-helpers.js')
  , startAppium = gruntHelpers.startAppium
  , authorize = gruntHelpers.authorize
  , downloadUICatalog = gruntHelpers.downloadUICatalog
  , tail = gruntHelpers.tail
  , buildApp = gruntHelpers.buildApp
  , signApp = gruntHelpers.signApp
  , setupAndroidBootstrap = gruntHelpers.setupAndroidBootstrap
  , setupAndroidApp = gruntHelpers.setupAndroidApp
  , buildAndroidBootstrap = gruntHelpers.buildAndroidBootstrap
  , buildAndroidApp = gruntHelpers.buildAndroidApp
  , installAndroidApp = gruntHelpers.installAndroidApp
  , generateServerDocs = gruntHelpers.generateServerDocs
  , generateAppiumIo = gruntHelpers.generateAppiumIo
  , runTestsWithServer = gruntHelpers.runTestsWithServer;

module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: ['*.js', 'app/*.js', 'app/test/unit/*.js', 'instruments/*.js', 'test/functional/*.js', 'test/unit/*.js', 'test/functional/appium/*.js', 'test/functional/testapp/*.js', 'test/functional/uicatalog/*.js', 'test/functional/webview/*.js', 'test/helpers/*.js', 'test/functional/safari/*.js', 'test/functional/prefs/*.js', 'app/uiauto/appium/app.js', 'app/uiauto/appium/binding.js', 'app/uiauto/element.js', 'app/uiauto/appium/utility.js', 'app/uiauto/lib/instruments_client.js', 'app/uiauto/lib/status.js', 'uiautomator/*.js']
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
      TestApp: ['ios', {
        functional: ['test/functional/testapp']
        , server: ['test/functional/appium/appium.js'
                   , 'test/functional/appium/jsonwp.js']
      }]
      , UICatalog: ['ios', {
        functional: ['test/functional/uicatalog']
      }]
      , WebViewApp: ['ios', {
        functional: ['test/functional/webview']
      }]
      , ApiDemos: ['android', {
        functional: ['test/functional/apidemos']
      }]
      , Safari: ['ios', {
        functional: ['test/functional/safari']
      }]
      , Preferences: ['ios', {
        functional: ['test/functional/prefs']
      }]
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
    runTestsWithServer(grunt, null, 'functional', null, log === "log", this.async());
  });
  grunt.registerTask('servertest', "Run functional server tests", function(log) {
    runTestsWithServer(grunt, 'TestApp', 'server', null, log === "log", this.async());
  });
  grunt.registerTask('android', "Run functional android tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', 'android', log === "log", this.async());
  });
  grunt.registerTask('ios', "Run functional ios tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', 'ios', log === "log", this.async());
  });
  grunt.registerTask('test', ['jshint', 'unit', 'appiumutils', 'functional', 'servertest']);
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
  grunt.registerTask('configAndroidBootstrap', function() {
    var cb = this.async();
    setupAndroidBootstrap(grunt, function(exitCode) {
      cb(exitCode === 0);
    });
  });
  grunt.registerTask('buildAndroidBootstrap', function() {
    var cb = this.async();
    buildAndroidBootstrap(grunt, function(exitCode) {
      cb(exitCode === 0);
    });
  });
  grunt.registerTask('configAndroidApp', function(appName) {
  var cb = this.async();
    setupAndroidApp(grunt, appName, function(exitCode) {
      cb(exitCode === 0);
    });
  });
  grunt.registerTask('buildAndroidApp', function(appName) {
    var cb = this.async();
    buildAndroidApp(grunt, appName, function(exitCode) {
      cb(exitCode === 0);
    });
  });
  grunt.registerTask('installAndroidApp', function(appName) {
    installAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('docs', function() {
    generateServerDocs(grunt, this.async());
  });
  grunt.registerTask('generateAppiumIo', function() {
    generateAppiumIo(grunt, this.async());
  });
};
