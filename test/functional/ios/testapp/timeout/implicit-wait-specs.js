"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired');

describe('testapp - timeout', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

  describe('implicit wait', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    var impWaitSecs = 4;
    var impWaitCheck = function () {
      var before = new Date().getTime() / 1000;
      return driver
        .elementsByClassName('UIANotGonnaBeThere').then(function (missing) {
          var after = new Date().getTime() / 1000;
          (after - before).should.be.below(impWaitSecs + 2);
          (after - before).should.be.above(impWaitSecs);
          missing.should.have.length(0);
        });
    };

    it('should set the implicit wait for finding elements', function (done) {
      driver
        .setImplicitWaitTimeout(impWaitSecs * 1000)
        .then(impWaitCheck)
        .nodeify(done);
    });

    it('should work even with a reset in the middle', function (done) {
      driver
        .setImplicitWaitTimeout(impWaitSecs * 1000)
        .then(impWaitCheck)
        .resetApp()
        .sleep(3000) // cooldown
        .then(impWaitCheck)
        .nodeify(done);
    });
  });
});
