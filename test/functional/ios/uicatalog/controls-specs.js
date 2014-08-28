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

  it('should be able to get and set a picker value(s)', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Picker View')]").click()
      .elementByXPath("//UIAPickerWheel[@name = 'Red color component value']")
      .then(function (wheel) {
        return wheel
          .getAttribute("value")
            .should.eventually.contain("65")
          .then(function () {
            return wheel.type("70")
              .getAttribute("value")
                .should.eventually.contain("70");
          });
      })
      .elementByXPath("//UIAPickerWheel[@name = 'Green color component value']")
      .then(function (wheel) {
        return wheel
            .type("70")
            .getAttribute("value")
              .should.eventually.contain("70");
      })
      .elementByXPath("//UIAPickerWheel[@name = 'Blue color component value']")
      .then(function (wheel) {
        return wheel
            .type("70")
            .getAttribute("value")
              .should.eventually.contain("70");
      })
      .elementByClassName("UIAPickerWheel")
        .getAttribute("values")
          .should.eventually.have.length(52)
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
              .then(function (val) {
                var numeric = parseInt(val.replace('%', ''));
                numeric.should.be.above(75);
                numeric.should.be.below(85);
              });
          })
          ;
      }).nodeify(done);
  });
});
