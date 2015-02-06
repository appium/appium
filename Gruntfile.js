"use strict";

var path = require('path')
  , gruntHelpers = require('./grunt-helpers.js')
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
  , fixSelendroidAndroidManifest = gruntHelpers.fixSelendroidAndroidManifest
  , installAndroidApp = gruntHelpers.installAndroidApp
  , generateServerDocs = gruntHelpers.generateServerDocs
  , generateAppiumIo = gruntHelpers.generateAppiumIo
  , setDeviceConfigVer = gruntHelpers.setDeviceConfigVer
  , setBuildTime = gruntHelpers.setBuildTime
  , getSampleCode = gruntHelpers.getSampleCode
  , setGitRev = gruntHelpers.setGitRev
  , getGitRev = require('./lib/helpers').getGitRev;

var GULP_BIN = 'node_modules/.bin/gulp';

module.exports = function (grunt) {
  grunt.initConfig({
  mochaTest: {
      appiumutils: ['test/functional/appium/appiumutils.js']
    }
  , mochaTestConfig: {
      options: {
        timeout: 60000,
        reporter: 'spec'
      }
    }
  , maxBuffer: 2000 * 1024
  , exec: {
      'gulp-test-unit': GULP_BIN + ' test-unit --color',
      'gulp-jshint': GULP_BIN + ' jshint --color',
      'gulp-jscs': GULP_BIN + ' jscs --color',
      'gulp-lint': GULP_BIN + ' lint --color'
    },
  });

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-exec');
  grunt.registerTask('jshint', 'exec:gulp-jshint');
  grunt.registerTask('jscs', 'exec:gulp-jscs');
  grunt.registerTask('lint', 'exec:gulp-lint');
  grunt.registerTask('test', 'exec:gulp-test-unit');
  grunt.registerTask('unit', 'exec:gulp-test-unit');
  grunt.registerTask('default', ['test']);
  grunt.registerTask('travis', ['jshint','jscs', 'unit']);
  grunt.registerTask('buildApp', "Build the test app", function (appDir, sdk) {
    buildApp(appDir, this.async(), sdk);
  });
  grunt.registerTask('buildSafariLauncherApp', "Build the SafariLauncher app", function (sdk, xcconfig) {
    buildSafariLauncherApp(this.async(), sdk, xcconfig);
  });
  grunt.registerTask('signApp', "Sign the test app", function (certName) {
    signApp("TestApp", certName, this.async());
  });
  grunt.registerTask('authorize', "Authorize developer", function (insecure) {
    authorize(grunt, insecure, this.async());
  });
  grunt.registerTask('log', "Tail appium.log", function () {
    tail(grunt, path.resolve(__dirname, "appium.log"), this.async());
  });
  grunt.registerTask('configAndroidBootstrap', function () {
    setupAndroidBootstrap(grunt, this.async());
  });
  grunt.registerTask('buildAndroidBootstrap', function () {
    buildAndroidBootstrap(grunt, this.async());
  });
  grunt.registerTask('buildSelendroidServer', function () {
    buildSelendroidServer(this.async());
  });
  grunt.registerTask('fixSelendroidAndroidManifest', function () {
    var destDir = path.resolve(__dirname, "build", "selendroid");
    var dstManifest = path.resolve(destDir, "AndroidManifest.xml");
    fixSelendroidAndroidManifest(dstManifest, this.async());
  });
  grunt.registerTask('configAndroidApp', function (appName) {
    setupAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('buildAndroidApp', function (appName) {
    buildAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('buildSelendroidAndroidApp', function (appName) {
    buildSelendroidAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('installAndroidApp', function (appName) {
    installAndroidApp(grunt, appName, this.async());
  });
  grunt.registerTask('docs', function () {
    generateServerDocs(grunt, this.async());
  });
  grunt.registerTask('generateAppiumIo', function () {
    generateAppiumIo(grunt, this.async());
  });
  grunt.registerTask('setConfigVer', function (device) {
    setDeviceConfigVer(grunt, device, this.async());
  });
  grunt.registerTask('setBuildTime', function () {
    setBuildTime(grunt, this.async());
  });
  grunt.registerTask('getSampleCode', function (hardcore) {
    if (typeof hardcore !== "undefined" && hardcore === "hardcore") {
      hardcore = true;
    }
    getSampleCode(grunt, hardcore, this.async());
  });
  grunt.registerTask('setGitRev', function (rev) {
    var done = this.async();
    if (typeof rev === "undefined") {
      getGitRev(function (err, rev) {
        if (err) throw err;
        setGitRev(grunt, rev, done);
      });
    } else {
      setGitRev(grunt, rev, done);
    }
  });
};
