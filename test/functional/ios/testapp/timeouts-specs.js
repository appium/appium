"use strict";

/*
 * Turns out python's implicit wait doesn't respect the functionality described
 * by WebDriver. Implemented it anyways for parity, will fix later and enable
 * this test
 */

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    _ = require('underscore');

describe('testapp - timeouts -', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

  describe('short command timeout', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should die with short command timeout', function (done) {
      driver
        .setCommandTimeout(3000)
        .sleep(5500)
        .elementByName('dont exist dogg')
          .should.be.rejectedWith(/status: (13|6)/)
        .nodeify(done);
    });
  });

  describe('mobile reset', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should die with short command timeout even after mobile reset', function (done) {
      driver
        .setCommandTimeout(3000)
        .resetApp()
        .sleep(6500)
        .elementByName('dont exist dogg')
          .should.be.rejectedWith(/status: (13|6)/)
        .nodeify(done);
    });
  });

  describe('command timeout set to 0', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('when set to 0 should disable itself', function (done) {
      driver
        .setCommandTimeout(0)
        .sleep(3000)
        .elementByClassName('UIAButton').should.eventually.exist
        .nodeify(done);
    });
  });

  describe('command timeout via desired caps', function () {
    var driver;
    setup(this, _.defaults({newCommandTimeout: 3}, desired))
      .then(function (d) { driver = d; });

    it('should die with short command timeout', function (done) {
      driver
        .sleep(5500)
        .elementByName('dont exist dogg')
          .should.be.rejectedWith(/status: (13|6)/)
        .nodeify(done);
    });
  });

  describe('check implicit wait', function () {
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
