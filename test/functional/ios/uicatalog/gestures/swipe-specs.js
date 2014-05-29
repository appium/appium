"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired')
  , spinWait = require('../../../../helpers/spin.js').spinWait;

var SLOW_DOWN_MS = 1000;

describe('uicatalog - gestures - swipe @skip-ios7 @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .flick(0, 70, false)
        .flick(0, 70, false)
        .sleep(SLOW_DOWN_MS)
        .nodeify(done);
    });
  }
  it('should work with wd function in pixels', function (done) {
    driver
      .elementByClassName('UIATableCell').getLocation()
      .then(function (location1) {
        return spinWait(function () {
          return driver
            .flick(0, -70, true)
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              ((location2.x === location1.x) &&
                (location2.y !== location1.y)
              ).should.be.ok;
            });
        }, 5000);

      }).nodeify(done);
  });
  it('should work with wd function in percent', function (done) {
    driver
      .elementByClassName('UIATableCell').getLocation()
      .then(function (location1) {
        return driver
          .flick(0, -0.1, true) // flaky
          .flick(0, -0.1, true)
          .flick(0, -0.1, true)
          .elementByClassName('UIATableCell').getLocation()
          .then(function (location2) {
            location2.x.should.equal(location1.x);
            location2.y.should.not.equal(location1.y, '===y');
          });
      }).nodeify(done);
  });
  it('should work with mobile function in pixels', function (done) {
    var opts = {startX: 50, startY: 400, endX: 50, endY: 300, duration: 2};
    driver
      .elementByClassName('UIATableCell').getLocation()
      .then(function (location1) {
        return spinWait(function () {
          return driver
            .execute("mobile: swipe", [opts])
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        });
      }).nodeify(done);
  });
  it('should work with mobile function in percent', function (done) {
    var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
    driver
      .elementByClassName('UIATableCell').getLocation()
      .then(function (location1) {
        return spinWait(function () {
          return driver
            .execute("mobile: swipe", [opts])
            .elementByClassName('UIATableCell').getLocation()
            .then(function (location2) {
              location2.x.should.equal(location1.x);
              location2.y.should.not.equal(location1.y);
            });
        });
      }).nodeify(done);
  });
  it('should not complete instantaneously', function (done) {
    var start = Date.now();
    var opts = {startX: 0.5, startY: 0.9, endX: 0.5, endY: 0.7, duration: 2};
    driver
      .execute("mobile: swipe", [opts])
      .then(function () {
        (Date.now() - start).should.be.above(1999);
      }).nodeify(done);
  });
});

