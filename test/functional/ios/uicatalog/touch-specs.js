"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , wd = require("wd")
  , TouchAction = wd.TouchAction;

describe('uicatalog - touch @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should tap element with count', function (done) {
    driver
      .elementByXPath('//UIAStaticText[contains(@label, \'Steppers\')]')
      .click()
      .elementsByAccessibilityId('Increment')
        .then(function (els) {
          var action = new TouchAction(driver);
          action.tap({
            el: els[0],
            count: 10
          });
          return action.perform();
        })
      .elementsByAccessibilityId('10')
        .should.eventually.have.length(2)
      .nodeify(done);
  });

  it('should tap element with offset and count', function (done) {
    driver
      .elementByXPath('//UIAStaticText[contains(@label, \'Steppers\')]')
      .click()
      .elementsByAccessibilityId('Increment')
        .then(function (els) {
          var action = new TouchAction(driver);
          action.tap({
            el: els[1],
            x: 10,
            y: 10,
            count: 7
          });
          return action.perform();
        })
      .elementsByAccessibilityId('7')
        .should.eventually.have.length(2)
      .nodeify(done);
  });

  it('should tap offset with count', function (done) {
    driver
      .elementByXPath('//UIAStaticText[contains(@label, \'Steppers\')]')
      .click()
      .elementsByAccessibilityId('Increment')
        .then(function (els) {
          els[2].getLocation()
            .then(function (loc) {
              var action = new TouchAction(driver);
              action.tap({
                x: loc.x,
                y: loc.y,
                count: 3
              });
              return action.perform();
            });
        })
      .waitForElementsByAccessibilityId('3', 3000, 500)
        .should.eventually.have.length(2)
      .nodeify(done);
  });
});
