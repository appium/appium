"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired');

describe('uicatalog - controls', function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .clickBack()
        .nodeify(done);
    });
  }

  it('should be able to get and set a picker value', function (done) {
    var picketIdx = env.IOS7 ? 0 : 2; // TODO: why?
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Pickers')]").click()
      .elementsByClassName("UIAPicker").at(picketIdx)
      .elementByClassName('>', "UIAPickerWheel")
      .then(function (wheel) {
        return wheel
          .getAttribute("values").then(function (values) {
            return values[1];
          }).should.become("Chris Armstrong")
          .then(function () {
            return wheel.type("Serena Auroux")
              .getAttribute("value").should.become("Serena Auroux. 3 of 7");
          });
      })
      .nodeify(done);
  });

  it('should be able to get and set a slider value', function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Controls')]").click()
      .elementByClassName("UIASlider").then(function (slider) {
        return slider
          .getAttribute("value").should.become('50%')
          .then(function () {
            return slider.sendKeys(0.8).getAttribute("value").then(function (val) {
              ['80%', '82%'].should.include(val); // irregular 82% occurence
            });
          });
      }).nodeify(done);
  });
});
