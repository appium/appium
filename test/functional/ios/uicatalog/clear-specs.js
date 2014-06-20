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

        .elementByXPath("//UIATextField").click()
        .elementByAccessibilityIdOrNull("Go").should.eventually.exist
        .hideKeyboard()
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist

        .elementByXPath("//UIATextField").click()
        .elementByAccessibilityIdOrNull("Go").should.eventually.exist
        .hideKeyboard({strategy: 'tapOutside'})
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist

        .elementByXPath("//UIATextField").click()
        .elementByAccessibilityIdOrNull("Go").should.eventually.exist
        .hideKeyboard({strategy: 'tapOut'})
        .elementByAccessibilityIdOrNull("Go").should.not.eventually.exist

        .nodeify(done);
    });
  });
});
