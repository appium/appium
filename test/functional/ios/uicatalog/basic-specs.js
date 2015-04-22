"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , status = require("../../../../lib/server/status")
  , desired = require('./desired');

describe('uicatalog - basic @skip-ios6', function () {
  var textTag = env.IOS7 ? '@label' : '@value';

  describe('api', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    if (env.FAST_TESTS) {
      beforeEach(function (done) {
        driver
          .back()
          .nodeify(function () { done(); });
      });
    }

    it('should confirm element is not visible', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(" + textTag + ", 'Buttons')]").click()
        .elementByXPath("//UIANavigationBar/UIAImage")
        .isDisplayed()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is visible', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(" + textTag + ", 'Buttons')]").click()
        .elementByXPath("//UIATableGroup[@name = 'SYSTEM (CONTACT ADD)']")
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is selected', function (done) {
      driver
        .execute("mobile: scroll", {direction: 'down'})
        .elementByXPath("//UIAStaticText[contains(@label, 'Switches')]").click()
        .elementByClassName("UIASwitch").isSelected()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is not selected returns false', function (done) {
      driver
        .execute("mobile: scroll", {direction: 'down'})
          .catch(function (err) {
            // Instruments is broken in 8.1, 8.2, 8.3
            // can't scroll if already scrolled all the way down
            err.status.should.equal(status.codes.JavaScriptError.code);
          })
        .elementByXPath("//UIAStaticText[contains(@label, 'Switches')]").click()
        .elementByClassName("UIASwitch").click().isSelected()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

  });

  describe('appium ios @skip-ci', function () {
    // todo: check this test, it does not do what it says
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should go back to using app from before', function (done) {
      driver
        .elementsByClassName('UIATableView')
          .should.eventually.have.length.above(0)
        .nodeify(done);
    });
  });
});
