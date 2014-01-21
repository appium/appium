"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired")
  , sessionUtils = require('../../helpers/session-utils')
  , path = require('path')
  , ADB = require("../../../lib/devices/android/adb.js")
  , chai = require('chai')
  , should = chai.should()
  , spawn = require('child_process').spawn
  , _ = require('underscore');

describe('basic', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    browser
      .execute("mobile: setCommandTimeout", [params])
      .sleep(4000)
      .elementByName('Animation')
        .should.be.rejectedWith(/status: (13|6)/)
      .nodeify(done);
  });
});

describe('basic', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should not die if commands come in', function(done) {
    var start;
    var find = function() {
      if ((Date.now() - start) < 5000) {
        return browser
          .elementByName('Animation').should.eventually.exist
          .then(find);
      }
    };
    var params = {timeout: 7};
    browser
      .execute("mobile: setCommandTimeout", [params])
      .then(function() { start = Date.now(); })
      .then(find)
      .sleep(10000)
      .elementByName('Animation').should.be.rejected
      .nodeify(done);
  });
});

describe('basic', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should get device size', function(done) {
    browser.getWindowSize()
      .then(function(size) {
        size.width.should.be.above(0);
        size.height.should.be.above(0);
      }).nodeify(done);
  });

  it('should be able to get current activity', function(done) {
    browser
      .execute("mobile: currentActivity")
        .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
  it('should be able to get logcat log type', function(done) {
    browser
      .logTypes()
        .should.eventually.include('logcat')
      .nodeify(done);
  });
  it('should be able to get logcat logs', function(done) {
    browser.log('logcat').then(function(logs) {
      logs.length.should.be.above(0);
      logs[0].message.should.not.include("\n");
      logs[0].level.should.equal("ALL");
      logs[0].timestamp.should.exist;
    }).nodeify(done);
  });
  it('should be able to detect if app is installed', function(done) {
    browser
      .execute('mobile: isAppInstalled', [{bundleId: 'foo'}])
        .should.eventually.equal(false)
      .execute('mobile: isAppInstalled', [{bundleId: 'com.example.android.apis'}])
        .should.eventually.equal(true)
      .nodeify(done);
  });
  it("should background the app", function(done) {
    var before = new Date().getTime() / 1000;
    browser
      .execute("mobile: background", [{seconds: 3}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.above(2);
        ((new Date().getTime() / 1000) - before).should.be.below(5);
      })
      .execute("mobile: currentActivity")
        .should.eventually.include("ApiDemos")
      .nodeify(done);
  });
});

describe('without fastClear', function() {
  var browser;
  setup(this, _.defaults( {fastClear: false}, desired))
   .then( function(_browser) { browser = _browser; } );

  it('should still be able to reset', function(done) {
    browser
      .execute('mobile: reset')
      .getWindowSize()
      .nodeify(done);
  });
});

describe('activity style: no period', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should still find activity', function(done) {
      session = sessionUtils.initSession( _.defaults({'app-activity': 'ApiDemos'}, desired));
      session.setUp().nodeify(done);
  });
});

describe('activity style: fully qualified', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should still find activity', function(done) {
      session = sessionUtils.initSession( _.defaults({'app-activity': 'com.example.android.apis.ApiDemos'}, desired));
      session.setUp().nodeify(done);
  });
});

describe('activity style: non-existent', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should throw an error', function(done) {
    session = sessionUtils.initSession( _.defaults({'app-activity': '.Blargimarg'}, desired));
    session.setUp()
      .catch(function(err) { throw err.data; })
      .should.be.rejectedWith(/Activity used to start app doesn't exist/)
      .nodeify(done);
  });
});

describe('bad app path', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should throw an error', function(done) {
    var badAppPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debugz.apk");
    session = sessionUtils.initSession( _.defaults({'app': badAppPath}, desired));
    session.setUp()
      .catch(function(err) { throw err.data; })
      .should.be.rejectedWith(/Error locating the app/)
      .nodeify(done);
  });
});

describe('no activity sent in with caps', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should throw an error', function(done) {
    session = sessionUtils.initSession( _.omit(desired, 'app-activity'));
    session.setUp()
      .catch(function(err) { throw err.data; })
      .should.be.rejectedWith(/app-activity/)
      .nodeify(done);
  });
});

describe('no package sent in with caps', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should throw an error', function(done) {
    session = sessionUtils.initSession( _.omit(desired, 'app-package'));
    session.setUp()
      .catch(function(err) { throw err.data; })
      .should.be.rejectedWith(/app-package/)
      .nodeify(done);
  });
});

describe('pre-existing uiautomator session', function() {
  before(function(done) {
    var adb = new ADB();
    var binPath = path.resolve(__dirname, "..", "..", "..", "build",
        "android_bootstrap", "AppiumBootstrap.jar");
    var uiArgs = ["shell", "uiautomator", "runtest", "AppiumBootstrap.jar", "-c",
      "io.appium.android.bootstrap.Bootstrap"];
    adb.push(binPath, "/data/local/tmp/", function(err) {
      should.not.exist(err);
      spawn("adb", uiArgs);
      setTimeout(function() {
        adb.getPIDsByName("uiautomator", function(err, pids) {
          should.not.exist(err);
          pids.length.should.equal(1);
          done();
        });
      }, 2000);
    });
  });
  describe('launching new session', function() {
    var browser;
    setup(this, _.defaults( {fastClear: false}, desired))
     .then( function(_browser) { browser = _browser; } );

    it('should kill pre-existing uiautomator process', function(done) {
      browser.getWindowSize().should.eventually.exist
        .nodeify(done);
    });
  });
});

describe('appium android', function() {
  var session;
  after(function() { session.tearDown(); });
  it('should load a zipped app via url', function(done) {
      var appUrl = 'http://appium.s3.amazonaws.com/ApiDemos-debug.apk';
      session = sessionUtils.initSession( _.defaults({'app': appUrl}, desired));
      session.setUp().nodeify(done);
  });
});
