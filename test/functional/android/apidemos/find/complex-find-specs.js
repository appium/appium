"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired");

describe("apidemo - find - complex", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp().nodeify(done);
    });
  }

  it('should scroll to an element by text or content desc', function (done) {
    driver
      .complexFind(["scroll", [[3, "views"]], [[7, "views"]]]).text()
        .should.become("Views")
      .nodeify(done);
  });
  it('should find a single element by content-description', function (done) {
    driver.complexFind([[[7, "Animation"]]]).text()
        .should.become("Animation")
      .nodeify(done);
  });
  it('should find a single element by text', function (done) {
    driver.complexFind([[[3, "Animation"]]]).text()
        .should.become("Animation")
      .nodeify(done);
  });
});
