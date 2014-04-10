"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("apidemos - screenshot -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should get an app screenshot', function (done) {
    driver.takeScreenshot()
      .should.eventually.have.length.above(1000)
      .nodeify(done);
  });
  it('should not cause other commands to fail', function (done) {
    driver
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .takeScreenshot()
        .should.eventually.have.length.above(1000)
      .execute("mobile: find", [[[[3, "Animation"]]]])
        .should.eventually.exist
      .sleep(5000) // cooldown
      .nodeify(done);
  });
});
