"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - get attribute', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should get element attribute', function (done) {
    driver
      .elementByClassName('UIAButton').getAttribute("name").should.become("ComputeSumButton")
      .nodeify(done);
  });
});
