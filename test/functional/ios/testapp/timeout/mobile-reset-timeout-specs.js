"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired');

describe('testapp - timeout', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

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
});
