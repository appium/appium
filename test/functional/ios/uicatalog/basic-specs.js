"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('uicatalog - basic', function () {
  var textTag = env.IOS7 ? '@label' : '@value';

  describe('api', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    // if (env.FAST_TESTS) {
    //   beforeEach(function (done) {
    //     driver
    //       .back()
    //       .nodeify(function () { done(); });
    //   });
    // }

    it('should confirm element is not visible', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(" + textTag + ", 'Buttons')]").click()
        .elementByXPath("//UIAButton[contains(@name, 'UINavigationBarBackIndicatorDefault')]")
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

    it('should confirm element is selected @skip-ios7', function (done) {
      // TODO: review select implementation for ios7
      driver
        .elementByXPath("//UIAStaticText[contains(@label, 'Pickers')]").click()
        .elementByXPath("//UIAButton[contains(@label, 'UIPicker')]").isSelected()
          .should.eventually.be.ok
        .nodeify(done);
    });

    it('should confirm element is not selected returns false @skip-ios7', function (done) {
      // TODO: review select implementation for ios7
      driver
        .elementByXPath("//UIAStaticText[contains(@label, 'Pickers')]").click()
        .elementByXPath("//UIAButton[contains(@label, 'Custom')]").isSelected()
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
