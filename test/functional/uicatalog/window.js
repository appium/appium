"use strict";

var setup = require('./setup');

describe('window handles', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('getting handles should do nothing when no webview open', function(done) {
    browser
      .windowHandles().should.eventually.have.length(0)
      .nodeify(done);
  });
});
