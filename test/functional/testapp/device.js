"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('device target actions', function(h) {
  it("should die in background and respond within (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver.execute("mobile: background", [{seconds: 1}], function(err) {
      should.exist(err);
      err.status.should.equal(13);
      err.cause.value.message.should.contain("Instruments died");
      var after = new Date().getTime() / 1000;
      should.ok((after - before) <= 10);
      done();
    });
  });
});
