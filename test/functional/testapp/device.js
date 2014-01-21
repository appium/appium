"use strict";

var setup = require('./setup');

describe('device target actions', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it("should die in background and respond within (+/- 6 secs)", function(done) {
    var before = new Date().getTime() / 1000;
    browser
      .execute("mobile: background", [{seconds: 1}])
      .catch(function(err) {
        err.cause.value.message.should.contain("Instruments died");
        throw err;
      }).should.be.rejectedWith(/status: 13/)
      .then(function() { ((new Date().getTime() / 1000) - before).should.be.below(10); })
      .nodeify(done);
  });
});
