"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired');

var SLOW_DOWN_MS = 1000;

describe("uicatalog - gestures - swipe element @skip-ios7 @skip-ios6", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .elementByClassName("UIASlider")
        .then(function (el) { if (el) return el.sendKeys(0.42); })
        .clickButton('UICatalog')
        .sleep(SLOW_DOWN_MS)
        .nodeify(done);
    });
  }

  var getNumericValue = function (pctVal) {
    pctVal = pctVal.replace("%", "");
    pctVal = parseInt(pctVal, 10);
    return pctVal;
  };

  it("slider value should change", function (done) {
    var valueBefore, slider;
    driver
      .elementByAccessibilityId('Sliders').click()
      .elementByClassName("UIASlider").then(function (el) { slider = el; })
      .then(function () { return slider.getAttribute("value"); })
      .then(function (value) { valueBefore = value; })
      .then(function () {
        var opts = {startX: 0.5, startY: 0.5, endX: 0.25, endY: 0.5,
          duration: 0.3, element: slider.value};
        return driver.execute("mobile: swipe", [opts]);
      })
      .then(function () { return slider.getAttribute("value"); })
      .then(function (valueAfter) {
        valueBefore.should.equal("42%");
        valueAfter = getNumericValue(valueAfter);
        // should be around 20
        valueAfter.should.be.above(15);
        valueAfter.should.be.below(25);
      }).nodeify(done);
  });
  it("slider value should change by pixels", function (done) {
    var valueBefore, slider;
    driver
      .elementByAccessibilityId('Sliders').click()
      .elementByClassName("UIASlider").then(function (el) { slider = el; })
      .then(function () { return slider.getAttribute("value"); })
      .then(function (value) { valueBefore = value; })
      .then(function () {
        var opts = {endX: 15, endY: 10, duration: 0.3, element: slider.value};
        return driver.execute("mobile: swipe", [opts]);
      })
      .then(function () { return slider.getAttribute("value"); })
      .then(function (valueAfter) {
        valueBefore.should.equal("42%");
        valueAfter = getNumericValue(valueAfter);
        // should be around 5
        valueAfter.should.be.below(8);
      }).nodeify(done);
  });
});

