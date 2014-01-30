"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('testapp - device -', function () {

  describe('target actions', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it("should die in background and respond within (+/- 6 secs)", function (done) {
      var before = new Date().getTime() / 1000;
      driver
        .execute("mobile: background", [{seconds: 1}])
        .catch(function (err) {
          err.cause.value.message.should.contain("Instruments died");
          throw err;
        }).should.be.rejectedWith(/status: 13/)
        .then(function () { ((new Date().getTime() / 1000) - before).should.be.below(10); })
        .sleep(5000) // cooldown
        .nodeify(done);
    });
  });

});
