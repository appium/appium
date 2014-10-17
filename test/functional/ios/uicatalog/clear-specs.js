"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - clear @skip-ios6', function () {

  describe('hide keyboard', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    function waitOnSauce(ms) {
      return function () { if (env.SAUCE) return driver.sleep(ms); };
    }

    it('should be able to hide keyboard with the default strategy', function (done) {
      driver
        .execute("mobile: scroll", {direction: 'down'})
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard()
        .then(waitOnSauce(2000))
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });

    it('should be able to hide keyboard with the tapOutside strategy', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard({strategy: 'tapOutside'})
        .then(waitOnSauce(2000))
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });

    it('should be able to hide keyboard with the tapOut strategy', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@name, 'Web View')]").click()
        .waitForElementByXPath('//UIANavigationBar[@name="Web View"]', 5000, 500)
        .elementByXPath("//UIATextField").click()
        .waitForElementByAccessibilityId("Go", 5000, 500)
        .hideKeyboard({strategy: 'tapOut'})
        .then(waitOnSauce(2000))
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist
        .back()
        .nodeify(done);
    });
  });
});
