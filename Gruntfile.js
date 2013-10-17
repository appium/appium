"use strict";
var path = require('path')
  , gruntHelpers = require('./grunt-helpers.js')
  , startAppium = gruntHelpers.startAppium
  , authorize = gruntHelpers.authorize
  , tail = gruntHelpers.tail
  , buildApp = gruntHelpers.buildApp
  , buildSafariLauncherApp = gruntHelpers.buildSafariLauncherApp
  , signApp = gruntHelpers.signApp
  , setupAndroidBootstrap = gruntHelpers.setupAndroidBootstrap
  , setupAndroidApp = gruntHelpers.setupAndroidApp
  , buildAndroidBootstrap = gruntHelpers.buildAndroidBootstrap
  , buildSelendroidServer = gruntHelpers.buildSelendroidServer
  , buildAndroidApp = gruntHelpers.buildAndroidApp
  , buildSelendroidAndroidApp = gruntHelpers.buildSelendroidAndroidApp
  , installAndroidApp = gruntHelpers.installAndroidApp
  , generateServerDocs = gruntHelpers.generateServerDocs
  , generateAppiumIo = gruntHelpers.generateAppiumIo
  , setDeviceConfigVer = gruntHelpers.setDeviceConfigVer
  , setGitRev = gruntHelpers.setGitRev
  , getGitRev = require('./lib/helpers').getGitRev
  , runTestsWithServer = gruntHelpers.runTestsWithServer;

module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      files: ['*.js', './**/*.js']
      , options: {
        laxcomma: true
        , trailing: true
        , node: true
        , strict: true
        , ignores: ['./submodules/**/*.js', './node_modules/**/*.js', './lib/devices/ios/webdriver-atoms/*.js', './sample-code/**/*.js', './test/harmony/**/*.js', './test/functional/_joined/*.js', './lib/server/static/**/*.js', './lib/hybrid/firefoxos/atoms/*.js', './lib/devices/ios/uiauto/**/*.js']
      }
    }
    , mochaTest: {
      unit: ['test/unit/*.js']
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
      , Selendroid: ['selendroid', {
        functional: ['test/functional/selendroid']
      }]
      , Safari: ['ios', {
        functional: ['test/functional/safari']
      }]
      , Preferences: ['ios', {
        functional: ['test/functional/prefs']
      }]
      , Contacts: ['firefoxos', {
        functional: ['test/functional/firefoxos']
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
  grunt.registerTask('selendroid', "Run functional selendroid tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', 'selendroid', log === "log", this.async());
  });
  grunt.registerTask('ios', "Run functional ios tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', 'ios', log === "log", this.async());
  });
  grunt.registerTask('firefoxos', "Run functional firefoxos tests", function(log) {
    runTestsWithServer(grunt, null, 'functional', 'firefoxos', log === "log", this.async());
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
  grunt.registerTask('buildApp', "Build the test app", function(appDir, sdk) {
    buildApp(appDir, this.async(), sdk);
  });
  grunt.registerTask('buildSafariLauncherApp', "Build the SafariLauncher app", function(sdk) {
    buildSafariLauncherApp(this.async(), sdk);
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
    setupAndroidBootstrap(grunt, this.async());
  });
  grunt.registerTask('buildAndroidBootstrap', function() {
    buildAndroidBootstrap(grunt, this.async());
  });
  grunt.registerTask('buildSelendroidServer', function() {
    buildSelendroidServer(this.async());
  });
  grunt.registerTask('configAndroidApp', function(appName) {
    setupAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('buildAndroidApp', function(appName) {
    buildAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('buildSelendroidAndroidApp', function(appName) {
    buildSelendroidAndroidApp(grunt, appName, this.async());
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
  grunt.registerTask('setConfigVer', function(device) {
    setDeviceConfigVer(grunt, device, this.async());
  });
  grunt.registerTask('setGitRev', function(rev) {
    var done = this.async();
    if (typeof rev === "undefined") {
      getGitRev(function(err, rev) {
        if (err) throw err;
        setGitRev(grunt, rev, done);
      });
    } else {
      setGitRev(grunt, rev, done);
    }
  });
};
