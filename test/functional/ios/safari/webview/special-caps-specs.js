"use strict";

var env = require('../../../../helpers/env.js'),
    _ = require('underscore'),
    setup = require("../../../common/setup-base.js"),
    webviewHelper = require("../../../../helpers/webview.js"),
    loadWebView = webviewHelper.loadWebView,
    desired = require('./desired.js'),
    ChaiAsserter = require('../../../../helpers/asserter.js').ChaiAsserter;

describe('safari - webview - special capabilities', function () {
  describe('phishing warning', function () {
    var driver;
    var specialCaps = _.clone(desired);
    specialCaps.safariIgnoreFraudWarning = true;
    setup(this, specialCaps, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(specialCaps, driver).nodeify(done);
    });

    it('should not display a phishing warning with safariIgnoreFraudWarning @skip-chrome', function (done) {
      var titleToBecomeRight = new ChaiAsserter(function (driver) {
        return driver
          .title()
          .should.eventually.contain("I am another page title");
      });
      driver
        .get(env.PHISHING_END_POINT + 'guinea-pig2.html')
        .waitFor(titleToBecomeRight, 10000, 500)
        .nodeify(done);
    });
  });

  describe('performance logs', function () {
    var driver;
    var specialCaps = _.clone(desired);
    specialCaps.loggingPrefs = {performance: 'ALL'};
    setup(this, specialCaps, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(specialCaps, driver).nodeify(done);
    });

    it('should fetch performance logs', function (done) {
      driver
        .logTypes()
        .should.eventually.include('performance')
        .log('performance')
        .should.eventually.not.be.empty
        .nodeify(done);
    });
  });
});
