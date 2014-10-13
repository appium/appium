"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired');

var SLOW_DOWN_MS = 1000;

describe('uicatalog - gestures - flick @skip-ios8 @skip-ios7 @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .flick(0, 100, false)
        .flick(0, 100, false)
        .sleep(SLOW_DOWN_MS)
        .nodeify(done);
    });
  }

  it('should work via webdriver method', function (done) {
    driver
      .elementByClassName('UIATableCell').getLocationInView()
      .then(function (location1) {
        return driver
          .flick(0, -100, false)
          .elementByClassName('UIATableCell').getLocationInView()
          .then(function (location2) {
            location2.x.should.equal(location1.x);
            location2.y.should.not.equal(location1.y);
          });
      }).nodeify(done);
  });
  it('should work via mobile only method', function (done) {
    driver
      .elementByClassName('UIATableCell').getLocationInView()
      .then(function (location1) {
        return driver
          .execute("mobile: flick", [{endX: 0, endY: 0}])
          .elementByClassName('UIATableCell').getLocationInView()
          .then(function (location2) {
            location2.x.should.equal(location1.x);
            location2.y.should.not.equal(location1.y);
          });
      }).nodeify(done);
  });
  it('should not complete instantaneously', function (done) {
    var start = Date.now();
    driver
      .execute("mobile: flick", [{endX: 0, endY: 0}])
      .then(function () { (Date.now() - start).should.be.above(2500); })
      .nodeify(done);
  });
  it('should work via mobile only method with percentage', function (done) {
    var opts = {startX: 0.75, startY: 0.75, endX: 0.25, endY: 0.25};
    driver
      .elementByClassName('UIATableCell').getLocationInView()
      .then(function (location1) {
        return driver
          .execute("mobile: flick", [opts])
          .elementByClassName('UIATableCell').getLocationInView()
          .then(function (location2) {
            location2.x.should.equal(location1.x);
            location2.y.should.not.equal(location1.y);
          });
      }).nodeify(done);
  });

  describe('with element', function () {

    it("slider value should change", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () { return slider.flick(-0.5, 0, 1); })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {element: slider.value, endX: -50, endY: 0};
          return driver.execute("mobile: flick", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
    it("should work with mobile flick and percent", function (done) {
      var valueBefore, slider;
      driver
        .elementsByClassName('UIATableCell').then(function (els) { return els[1]; })
        .click()
        .elementByClassName("UIASlider").then(function (el) { slider = el; })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (value) { valueBefore = value; })
        .then(function () {
          var opts = {element: slider.value, startX: 0.5, startY: 0.0,
            endX: 0.0, endY: 0.0};
          return driver.execute("mobile: flick", [opts]);
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueBefore.should.not.equal("0%");
          valueAfter.should.equal("0%");
        }).nodeify(done);
    });
  });
});
