"use strict";

var driverblock = require("../../helpers/driverblock.js")
, describeWd = driverblock.describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('device target actions', function(h) {
  it("should die in background and respond within (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver
      .execute("mobile: background", [{seconds: 1}])
      .then(function() {}, function(err) {
        err.cause.value.message.should.contain("Instruments died");
        throw err;
      }).should.be.rejectedWith(/status: 13/)
      .then(function() { ((new Date().getTime() / 1000) - before).should.be.below(10); })
      .nodeify(done);
  });
});
