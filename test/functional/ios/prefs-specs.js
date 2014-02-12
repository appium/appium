"use strict";

var env = require("../../helpers/env")
  , setup = require("../common/setup-base")
  , initSession = require('../../helpers/session').initSession
  , chai = require('chai')
  , _ = require('underscore');

chai.should();

var desired = {
  app: 'settings'
, device: 'iPhone Simulator'
};

describe("prefs @skip-ios7", function () {

  describe('settings app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should turn off autocomplete', function (done) {
      var ios7 = env.DEVICE.indexOf("7") !== -1;
      var clickGeneral = {strategy: "tag name", selector: "tableCell", index: ios7 ? 0 : 1};
      var clickKeyboard = {strategy: "tag name", selector: "tableCell", index: ios7 ? 3 : 1};
      var switchEl;
      driver
        .execute("mobile: findAndAct", [clickGeneral])
        .sleep(1000)
        .execute("mobile: findAndAct", [clickKeyboard])
        .elementByXPath('//switch[@name="Auto-Correction"]')
        .then(function (el) { switchEl = el; return el; })
        .getValue().then(function (checked) {
          if (checked === 1) return switchEl.click();
        }).nodeify(done);
    });
  });

  var checkLocServ = function (driver, expected, cb) {
    driver
      .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 2}])
      .sleep(1000)
      .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 0}])
      .elementByTagName('switch')
      .getValue().then(function (checked) {
        checked.should.eql(expected);
      }).nodeify(cb);
  };

  var checkSafariSetting = function (driver, setting, expected, cb) {
    driver
      .elementsByTagName("tableCell")
      .then(function (els) { return els[4].click(); })
      .then(function () {
        if (setting === 'fraud') {
          return driver.elementByName("Fraud Warning");
        } else if (setting === 'popups') {
          return driver.elementByName("Block Pop-ups");
        } else {
          return new Error("Bad setting " + setting);
        }
      })
      .getValue().then(function (checked) {
        (!!parseInt(checked, 10)).should.eql(!!expected);
      }).nodeify(cb);
  };

  describe('settings app with location services', function () {
    var driver;
    setup(this, _.defaults({locationServicesEnabled: true}, desired))
      .then(function (d) { driver = d; });

    it('should respond to positive locationServicesEnabled cap', function (done) {
      checkLocServ(driver, 1, done);
    });
  });

  describe('settings app without location services', function () {
    var driver;
    setup(this, _.defaults({locationServicesEnabled: false}, desired))
      .then(function (d) { driver = d; });

    it('should respond to negative locationServicesEnabled cap', function (done) {
      checkLocServ(driver, 0, done);
    });
  });

  describe('safari prefs', function () {
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

    describe('using safariAllowPopups', function () {
      var driver;
      setup(this, _.defaults({safariAllowPopups: true}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when true', function (done) {
        checkSafariSetting(driver, 'popups', 0, done);
      });
    });

    describe('using safariAllowPopups', function () {
      var driver;
      setup(this, _.defaults({safariAllowPopups: false}, desired))
        .then(function (d) { driver = d; });

      it('should respond to cap when false', function (done) {
        checkSafariSetting(driver, 'popups', 1, done);
      });
    });
  });
});
