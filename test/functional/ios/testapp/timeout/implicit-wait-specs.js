"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired');

describe('testapp - timeout', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

  describe('implicit wait', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    var impWaitCheck = function (impWaitMs) {
      return function () {
        var before = new Date().getTime();
        return driver
          .elementsByClassName('UIANotGonnaBeThere').then(function (missing) {
            var after = new Date().getTime();
            (after - before).should.be.below(impWaitMs + 2000);
            (after - before).should.be.above(impWaitMs);
            missing.should.have.length(0);
          });
      };
    };

    it('should set the implicit wait for finding elements', function (done) {
      driver
        .setImplicitWaitTimeout(4000)
        .then(impWaitCheck(4000))
        .nodeify(done);
    });

    it('should work with small command timeout', function (done) {
      driver
        .setCommandTimeout(5000)
        .setImplicitWaitTimeout(10000)
        .then(impWaitCheck(10000))
        .nodeify(done);
    });

    it('should work even with a reset in the middle', function (done) {
      driver
        .setCommandTimeout(60000)
        .setImplicitWaitTimeout(4000)
        .then(impWaitCheck(4000))
        .resetApp()
        .sleep(3000) // cooldown
        .then(impWaitCheck)
        .nodeify(done);
    });
  });
});
