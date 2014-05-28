"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired');

describe('testapp - timeout', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

  describe('zero timeout', function () {
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

});
