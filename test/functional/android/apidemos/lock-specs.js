"use strict";

var setup = require("../../common/setup-base")
    , desired = require("./desired");

describe("apidemos - lock", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should lock the screen', function (done) {
    driver
        .lockDevice(3)
        .nodeify(done);
  });
  it('should know it\'s locked', function (done) {
    driver
        .lockDevice(3)
        .isLocked()
        .should.eventually.equal(true)
        .nodeify(done);
  });
  it('should unlock the screen', function (done) {
    driver
        .lockDevice(3)
        .unlockDevice()
        .nodeify(done);
  });
  it('should know it\'s unlocked', function (done) {
    driver
        .lockDevice(3)
        .unlockDevice()
        .isLocked()
        .should.eventually.equal(false)
        .nodeify(done);
  });
});
