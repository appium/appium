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
  , setGitRev = gruntHelpers.setGitRev
  , getGitRev = require('./lib/helpers').getGitRev;

module.exports = function (grunt) {
  grunt.initConfig({
    jshint: {
      options: {
        laxcomma: true
      , node: true
      , strict: true
      , indent: 2
      , undef: true
      , unused: true
      , eqeqeq: true
      },
      files: {
        src: ['*.js', './**/*.js'],
        options: {
          ignores: ['./submodules/**/*.js', './node_modules/**/*.js', './sample-code/**/*.js', './test/**/*.js', './lib/server/static/**/*.js', './lib/devices/firefoxos/atoms/*.js', './lib/devices/ios/uiauto/**/*.js']
        }
      },
      test: {
        src: ['test/**/*.js']
      , options: {
          ignores: ['./test/harmony/**/*.js', './test/functional/_joined/*.js']
        , expr: true
        , globals: {
            'describe': true
          , 'it': true
          , 'before': true
          , 'after': true
          , 'beforeEach': true
          , 'afterEach': true
          }
        }
      }
    }
  , jscs: {
    src: '**/*.js',
    options: {
        config: ".jscs.json"
      }
    }
  , mochaTest: {
      unit: ['test/unit/*.js']
    , appiumutils: ['test/functional/appium/appiumutils.js']
    }
  , mochaTestConfig: {
      options: {
        timeout: 60000,
        reporter: 'spec'
      }
    }
  , maxBuffer: 2000 * 1024
  });

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks("grunt-jscs-checker");
  grunt.registerTask('lint', ['jshint','jscs']);
  grunt.registerTask('test', 'mochaTest:unit');
  grunt.registerTask('unit', 'mochaTest:unit');
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
