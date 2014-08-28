"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('uicatalog - basic @skip-ios7up', function () {

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
        .elementByClassName('UIATableCell').click()
        .elementByName("UIButtonTypeContactAdd").isDisplayed()
          .should.not.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is visible', function (done) {
      driver
        .elementByClassName('UIATableCell').click()
        .elementByName("UIButtonTypeRoundedRect").isDisplayed()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is selected  @skip-ios7up', function (done) {
      driver
        .elementByXPath("//UIATableCell/UIAStaticText[contains(@label, 'Pickers')]")
          .click()
        .elementByXPath("//UIAButton[contains(@label, 'UIPicker')]")
          .isSelected().should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is not selected returns false', function (done) {
      driver
        .elementByXPath("//UIATableCell/UIAStaticText[contains(@label, 'Pickers')]")
          .click()
        .elementByXPath("//UIAButton[contains(@label, 'Custom')]")
          .isSelected().should.not.eventually.be.ok
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
