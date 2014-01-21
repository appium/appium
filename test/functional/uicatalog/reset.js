"use strict";

var setup = require('./setup');

describe('app reset', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it("should be able to find elements after a soft reset", function(done) {
    browser
      .elementsByTagName('tableView')
        .should.eventually.have.length(1)
      .execute("mobile: reset")
      .elementsByTagName('tableView')
        .should.eventually.have.length(1)
      .nodeify(done);
  });
});
