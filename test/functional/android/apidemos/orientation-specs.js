"use strict";

var setup = require("../../common/setup-base")
  , env = require('../../../helpers/env')
  , desired = require("./desired")
  , androidReset = require('../../../helpers/reset').androidReset;

describe("apidemos - orientation -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      androidReset(desired['app-package'], desired['app-activity']).nodeify(done);
    });
  }
  
  it('should rotate screen to landscape', function (done) {
    driver
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .getOrientation().should.become("LANDSCAPE")
      .nodeify(done);
  });
  it('should rotate screen to portrait', function (done) {
    driver
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
  it('Should not error when trying to rotate to portrait again', function (done) {
    driver
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
});
