"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - clear @skip-ios6', function () {

  describe('hide keyboard', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should be able to hide keyboard with the default strategy', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").moveTo(10, 10).click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard()
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });

    it('should be able to hide keyboard with the tapOutside strategy', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").moveTo(10, 10).click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard({strategy: 'tapOutside'})
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });

    it('should be able to hide keyboard with the tapOut strategy', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").moveTo(10, 10).click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard({strategy: 'tapOut'})
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });

  });
});
