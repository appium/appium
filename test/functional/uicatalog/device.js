"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it;

describeWd('device target actions', function(h) {
  it("should lock the device for 4 of seconds (+/- 2 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver
      .execute("mobile: lock", [{seconds: 4}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.below(7);
      }).nodeify(done);
  });
  it("should background the app for 4 of seconds (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver
      .execute("mobile: background", [{seconds: 4}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.below(11);
      }).nodeify(done);
  });
});
