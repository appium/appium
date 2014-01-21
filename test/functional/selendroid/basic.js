"use strict";

var setup = require("../common/setup-base")
  , sessionUtils = require('../../helpers/session-utils')
  , path = require('path')
  , wd = require('wd')
  , Q = wd.Q
  , _ = require('underscore');

  var desired = {
    app: path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk"),
    'app-package': 'com.example.android.apis',
    'app-activity': '.ApiDemos'
  };

  // , appAct2 = "ApiDemos"
  // , appActFull = "com.example.android.apis.ApiDemos"


describe('basic', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should find and click an element', function(done) {
    // selendroid appears to have some issues with implicit waits
    // hence the timeouts
    browser
      .sleep(1000)
      .elementByName('App').click()
      .sleep(1000)
      .elementByLinkText("Action Bar").should.eventually.exist
      .nodeify(done);
  });

  it('should be able to get logcat log type', function(done) {
    browser.logTypes().should.eventually.include('logcat')
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

  it('should be able to proxy errors', function(done) {
    browser
      .frame(null).should.be.rejected
      .nodeify(done);
  });

  it('should be able to set location', function(done) {
    var locOpts = {latitude: "27.17", longitude: "78.04"};
    browser
      .execute("mobile: setLocation", [locOpts])
      .nodeify(done);
  });

  it('should error out nicely with incompatible commands', function(done) {
    browser
      .execute("mobile: flick", [{}])
      .catch(function(err) {
        err.cause.value.origValue.should.contain('mobile:'); throw err;
      }).should.be.rejectedWith(/status: 9/)
      .nodeify(done);
  });

  it('should be able to uninstall the app', function(done) {
    browser
      .execute("mobile: removeApp", [{bundleId: desired['app-package']}])
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

describe('command timeouts', function() {
  var browser;
  setup(this, _.defaults({newCommandTimeout: 3} , desired))
   .then( function(_browser) { browser = _browser; } );
  
  it('should die with short timeout', function(done) {
    browser
      .sleep(5000)
      .elementByName('Animation')
        .should.be.rejectedWith(/(status: (13|6))|(Not JSON response)/)
      .nodeify(done);
  });
});

describe('command timeouts', function() {
  var browser;
  setup(this, _.defaults({newCommandTimeout: 7} , desired))
   .then( function(_browser) { browser = _browser; } );

  it('should not die if commands come in', function(done) {
    var start = Date.now();
    var find = function() {
      if ((Date.now() - start) < 5000) {
        return browser
          .elementByName('Animation').should.eventually.exist
          .sleep(500)
          .then(find);
      } else return new Q();
    };
    find().then(function() {
      return browser
        .sleep(10000)
        .elementByName('Animation').should.be.rejected;
    }).nodeify(done);
  });
});

describe('app activities with no dot', function() {
  var session;
  after(function() { session.tearDown(); });

  it('should not launch app', function(done) {
    session = sessionUtils.initSession(_.defaults({'app-activity': 'ApiDemos'} , desired));
    session.setUp()
      .should.be.rejected
      .nodeify(done);
  });
});


describe('fully qualified app activities', function() {
  var session;
  after(function() { session.tearDown(); });

  it('should still launch app', function(done) {
    session = sessionUtils.initSession(_.defaults({'app-activity': 'com.example.android.apis.ApiDemos'} , desired));
    session.setUp()
      .nodeify(done);
  });
});
