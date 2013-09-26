"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
  , should = require('should');

describeWd('device target actions', function(h) {
  it("should lock the device for 4 of seconds (+/- 2 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver.execute("mobile: lock", [{seconds: 4}], function(err) {
      should.not.exist(err);
      var after = new Date().getTime() / 1000;
      should.ok(after - before <= 6);
      done();
    });
  });
  it("should background the app for 4 of seconds (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    h.driver.execute("mobile: background", [{seconds: 4}], function(err) {
      should.not.exist(err);
      var after = new Date().getTime() / 1000;
      should.ok((after - before) <= 10);
      done();
    });
  });
});
