"use strict";

var setup = require("../../common/setup-base")
    , desired = require("./desired")
    , Asserter = require('wd').Asserter
    , chai = require('chai');

describe("apidemos - lock", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var isLockedAsserter = function (opts) {
    return new Asserter(
      function (driver) {
        return driver
          .isLocked()
          .then(function (isLocked) {
            isLocked.should.equal(opts.expected);
            return isLocked;
          })
          .catch(function (err) {
            err.retriable = err instanceof chai.AssertionError;
            throw err;
          });
      }
    );
  };

  it('should lock the screen', function (done) {
    driver
      .isLocked()
      .should.not.eventually.be.ok
      .lockDevice(3)
      .waitFor(isLockedAsserter({expected: true}), 5000, 500)
      .should.eventually.be.ok
      .nodeify(done);
      });
  it('should unlock the screen', function (done) {
    driver
      .lockDevice(3)
      .waitFor(isLockedAsserter({expected: true}), 5000, 500)
      .should.eventually.be.ok
      .unlockDevice()
      .waitFor(isLockedAsserter({expected: false}), 5000, 500)
      .should.not.eventually.be.ok
      .nodeify(done);
    });
});
