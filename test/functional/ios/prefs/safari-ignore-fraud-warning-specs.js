"use strict";

var setup = require("../../common/setup-base")
  , chai = require('chai')
  , _ = require('underscore');

chai.should();

var desired = {
  browserName: 'safari'
};

describe('safari prefs @skip-ios7', function () {
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

describe('safari ios7 prefs @skip-ios6 @skip-ci', function () {
  // TODO modify the test to enable ci, right know it is checking a local file,
  // not gonna work with sauce
  var checkSafariSetting = require('./check-safari-settings').ios7;

  describe('using safariIgnoreFraudWarning', function () {
    var driver;
    setup(this, _.defaults({safariIgnoreFraudWarning: true}, desired))
      .then(function (d) { driver = d; });

    it('should respond to cap when true', function (done) {
      checkSafariSetting('WarnAboutFraudulentWebsites', false, done);
    });
  });

  describe('using safariIgnoreFraudWarning', function () {
    var driver;
    setup(this, _.defaults({safariIgnoreFraudWarning: false}, desired))
      .then(function (d) { driver = d; });

    it('should respond to cap when false', function (done) {
      checkSafariSetting('WarnAboutFraudulentWebsites', true, done);
    });
  });
});
