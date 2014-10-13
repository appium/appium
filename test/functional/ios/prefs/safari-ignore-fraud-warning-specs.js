"use strict";

var env = require("../../../helpers/env")
  , setup = require("../../common/setup-base")
  , chai = require('chai')
  , _ = require('underscore');

chai.should();

var desired = {
  browserName: 'safari'
};

if (env.IOS6) {
  describe('safari prefs @skip-ios6', function () {
    // TODO: safari does not install on ios6
    var checkSafariSetting = require('./check-safari-settings').ios6;

    describe('using safariIgnoreFraudWarning', function () {
      var driver;
      setup(this, _.defaults({safariIgnoreFraudWarning: true}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when true', function (done) {
        checkSafariSetting(driver, 'fraud', 0, done);
      });
    });

    describe('using safariIgnoreFraudWarning', function () {
      var driver;
      setup(this, _.defaults({safariIgnoreFraudWarning: false}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when false', function (done) {
        checkSafariSetting(driver, 'fraud', 1, done);
      });
    });
  });
} else if (env.IOS7 || env.IOS8) {
  describe('safari ios7/8 prefs @skip-ci', function () {
    // TODO modify the test to enable ci, right know it is checking a local file,
    // not gonna work with sauce
    var checkSafariSetting = require('./check-safari-settings').ios7up;

    describe('using safariIgnoreFraudWarning', function () {
      var driver;
      setup(this, _.defaults({safariIgnoreFraudWarning: true}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when true', function (done) {
        checkSafariSetting(driver._origCaps, 'WarnAboutFraudulentWebsites',
                           false, done);
      });
    });

    describe('using safariIgnoreFraudWarning', function () {
      var driver;
      setup(this, _.defaults({safariIgnoreFraudWarning: false}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when false', function (done) {
        checkSafariSetting(driver._origCaps, 'WarnAboutFraudulentWebsites',
                           true, done);
      });
    });
  });
}
