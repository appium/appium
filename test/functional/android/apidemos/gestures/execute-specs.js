"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , droidText = 'android.widget.TextView';

describe("apidemo - gestures - execute", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  it('should execute down/move/up via element value', function (done) {
    var element;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { driver.execute("mobile: down", [{element: element.value}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{element: element.value}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{element: element.value}]); })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should execute down/move/up click via pixel value', function (done) {
    var element, location, elSize, centerX, centerY;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () {
        centerX = location.x + (elSize.width / 2);
        centerY = location.y + (elSize.height / 2);
        driver.execute("mobile: down", [{x: centerX, y: centerY}]);
      })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{x: centerX, y: centerY}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{x: centerX, y: centerY}]); })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });

  it('should execute down/move/up via relative value', function (done) {
    var element, location, elSize, windowSize, relX, relY;

    driver
      .elementsByClassName(droidText).then(function (els) { element = els[1]; })
      .then(function () { return element.getLocation(); })
      .then(function (loc) { location = loc; })
      .then(function () { return element.getSize(); })
      .then(function (size) { elSize = size; })
      .then(function () { return driver.getWindowSize(); })
      .then(function (size) { windowSize = size; })
      .then(function () {
        relX = (location.x + (elSize.width / 2)) / windowSize.width;
        relY = (location.y + (elSize.height / 2)) / windowSize.height;
        driver.execute("mobile: down", [{x: relX, y: relY}]);
      })
      .sleep(3000)
      .then(function () { driver.execute("mobile: move", [{x: relX, y: relY}]); })
      .sleep(3000)
      .then(function () { driver.execute("mobile: up", [{x: relX, y: relY}]); })
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["Accessibility Node Provider"].should.include(text);
      }).nodeify(done);
  });
});
