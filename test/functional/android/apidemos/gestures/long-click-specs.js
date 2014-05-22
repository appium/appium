"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , droidText = 'android.widget.TextView';

describe("apidemo - gestures - long click", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp()
        .then(function () { return driver.sleep(3000); })
        .nodeify(done);
    });
  }

  it('should long click via element value', function (done) {
    var element;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: longClick", [{element: element.value}]); })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via element value with custom duration', function (done) {
    var element;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: longClick", [{element: element.value, duration: 1000}]); })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via pixel value', function (done) {
    var element, location, elSize;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () {
        var centerX = location.x + (elSize.width / 2);
        var centerY = location.y + (elSize.height / 2);
        driver.execute("mobile: longClick", [{x: centerX, y: centerY}]);
      })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should long click via relative value', function (done) {
    var element, location, elSize, windowSize;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () { return driver.getWindowSize(); })
      .then(function (size) { windowSize = size; })
      .then(function () {
        var relX = (location.x + (elSize.width / 2)) / windowSize.width;
        var relY = (location.y + (elSize.height / 2)) / windowSize.height;
        driver.execute("mobile: longClick", [{x: relX, y: relY}]);
      })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });
});
