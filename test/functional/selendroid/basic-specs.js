"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var setup = require("../common/setup-base")
  , initSession = require('../../helpers/session').initSession
  , path = require('path')
  , Q = require("q")
  , _ = require('underscore');

var desired = {
  app: path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk"),
  'app-package': 'com.example.android.apis',
  'app-activity': '.ApiDemos'
};

  // , appAct2 = "ApiDemos"
  // , appActFull = "com.example.android.apis.ApiDemos"

describe('selendroid - basic -', function () {

  describe('api', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });
    // todo: issue with find
    it('should find and click an element @skip-selendroid-all', function (done) {
      // selendroid appears to have some issues with implicit waits
      // hence the timeouts
      driver
        .waitForElementByName('App', 10000).click()
        .sleep(1000)
        .elementByLinkText("Action Bar").should.eventually.exist
        .nodeify(done);
    });

    it('should be able to get logcat log type', function (done) {
      driver.logTypes().should.eventually.include('logcat')
        .nodeify(done);
    });
    it('should be able to get logcat logs', function (done) {
      driver.log('logcat').then(function (logs) {
        logs.length.should.be.above(0);
        logs[0].message.should.not.include("\n");
        logs[0].level.should.equal("ALL");
        logs[0].timestamp.should.exist;
      }).nodeify(done);
    });

    it('should be able to proxy errors', function (done) {
      driver
        .elementByCss("foobar").should.be.rejected
        .nodeify(done);
    });

    it('should be able to set location', function (done) {
      var locOpts = {latitude: "27.17", longitude: "78.04"};
      driver
        .execute("mobile: setLocation", [locOpts])
        .nodeify(done);
    });

    it('should error out nicely with incompatible commands', function (done) {
      driver
        .execute("mobile: flick", [{}])
        .catch(function (err) {
          err.cause.value.origValue.should.contain('mobile:');
          throw err;
        }).should.be.rejectedWith(/status: 9/)
        .nodeify(done);
    });

  });

  describe('uninstall app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should be able to uninstall the app', function (done) {
      driver
        .execute("mobile: removeApp", [{bundleId: desired['app-package']}])
        .nodeify(done);
    });
  });

  describe('background app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it("should background the app", function (done) {
      var before = new Date().getTime() / 1000;
      driver
        .execute("mobile: background", [{seconds: 3}])
        .then(function () {
          ((new Date().getTime() / 1000) - before).should.be.above(2);
          // this should not be tested
          // ((new Date().getTime() / 1000) - before).should.be.below(5);
        })
        .execute("mobile: currentActivity")
          .should.eventually.include("ApiDemos")
        .nodeify(done);
    });
  });

  // TODO: way too flaky 
  describe('command timeouts @skip-selendroid-all', function () {
    var driver;
    setup(this, _.defaults({newCommandTimeout: 3}, desired))
     .then(function (d) { driver = d; });

    it('should die with short timeout', function (done) {
      driver
        .sleep(5000)
        .elementByName('Animation')
          .should.be.rejectedWith(/(status: (13|6))|(Not JSON response)/)
        .nodeify(done);
    });
  });

  // TODO: issue with find
  describe('command timeouts @skip-selendroid-all', function () {
    var driver;
    setup(this, _.defaults({newCommandTimeout: 7}, desired))
     .then(function (d) { driver = d; });

    it('should not die if commands come in', function (done) {
      var start = Date.now();
      var find = function () {
        if ((Date.now() - start) < 5000) {
          return driver
            .elementByName('Animation').should.eventually.exist
            .sleep(500)
            .then(find);
        } else return new Q();
      };
      find().then(function () {
        return driver
          .sleep(10000)
          .elementByName('Animation').should.be.rejected;
      }).nodeify(done);
    });
  });

  describe('app activities with no dot', function () {
    var session;
    after(function () { session.tearDown(); });

    it('should not launch app', function (done) {
      session = initSession(_.defaults({'app-activity': 'ApiDemos'}, desired), {'no-retry': true});
      session.setUp()
        .should.be.rejected
        .nodeify(done);
    });
  });


  describe('fully qualified app activities', function () {
    var session;
    after(function () { session.tearDown(); });

    it('should still launch app', function (done) {
      session = initSession(_.defaults({'app-activity': 'com.example.android.apis.ApiDemos'}, desired));
      session.setUp()
        .nodeify(done);
    });
  });
});
