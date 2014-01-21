"use strict";

var setup = require('./setup');

describe('getAttribute', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should get element attribute', function(done) {
    browser
      .elementByTagName('button').getAttribute("name").should.become("ComputeSumButton")
      .nodeify(done);
  });
});
