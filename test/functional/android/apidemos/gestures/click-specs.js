"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , droidText = 'android.widget.TextView';

describe("apidemo - gestures - click", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  it('should click via x/y pixel coords', function (done) {
    driver
      .execute("mobile: tap", [{x: 100, y: 300}])
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; })
        .text()
        .then(function (text) {
          ['Accessibility Node Provider', 'Bouncing Balls', 'Action Bar'].should.include(text);
        })
      .nodeify(done);
  });
  //todo: not working in nexus 7
  it('should click via x/y pct', function (done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    driver
      .execute("mobile: tap", [{x: 0.6, y: 0.8}])
      .sleep(3000)
      .elementsByClassName(droidText).then(function (els) { return els[1]; }).text()
      .then(function (text) {
        ["ForegroundDispatch", "Morse Code", "1. Preferences from XML"].should.include(text);
      }).nodeify(done);
  });
  it('should click via touch api', function (done) {
    // this test depends on having a certain size screen, obviously
    // I use a nexus something or other phone style thingo
    driver.elementByName("Animation").tap()
      .sleep(1500)
      .elementsByClassName(droidText).then(function (els) { return els[1]; })
        .text().should.become("Bouncing Balls")
      .nodeify(done);
  });
});
