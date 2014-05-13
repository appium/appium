"use strict";

var setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore');

describe('testapp - timeout', function () {

  afterEach(function (done) { setTimeout(done, 3000); });

  describe('via desired caps', function () {
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
});
