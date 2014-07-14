"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('uicatalog - controls @skip-ios6', function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .clickButton('UICatalog')
        .nodeify(done);
    });
  }

  it('should be able to get and set a picker value', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Picker View')]").click()
      .elementByXPath("//UIAPickerWheel[@name = 'Red color component value']")
      .then(function (wheel) {
        return wheel
          .getAttribute("value")
            .should.become("65. 14 of 52")
          .then(function () {
            return wheel.type("70")
              .getAttribute("value")
                .should.become("70. 15 of 52");
          });
      })
      .elementByXPath("//UIAPickerWheel[@name = 'Green color component value']")
      .then(function (wheel) {
        return wheel
            .type("70")
            .getAttribute("value")
              .should.become("70. 15 of 52");
      })
      .elementByXPath("//UIAPickerWheel[@name = 'Blue color component value']")
      .then(function (wheel) {
        return wheel
            .type("70")
            .getAttribute("value")
              .should.become("70. 15 of 52");
      })
      .nodeify(done);
  });

  it('should be able to get and set a slider value', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Sliders')]").click()
      .elementByClassName("UIASlider").then(function (slider) {
        return slider
          .getAttribute("value").should.become('42%')
          .then(function () {
            return slider.sendKeys(0.8).getAttribute("value")
              .should.become('80%');
          })
          ;
      }).nodeify(done);
  });
});
