"use strict";

var setup = require('./setup');

describe('device target actions', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it("should lock the device for 4 of seconds (+/- 2 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    browser
      .execute("mobile: lock", [{seconds: 4}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.below(7);
      }).nodeify(done);
  });
  it("should background the app for 4 of seconds (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    browser
      .execute("mobile: background", [{seconds: 4}])
      .then(function() {
        ((new Date().getTime() / 1000) - before).should.be.below(11);
      }).nodeify(done);
  });
});
