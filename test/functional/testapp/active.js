"use strict";

var setup = require('./setup');

describe('active', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should return active element', function(done) {
    browser
      .elementsByTagName('textField').then(function(elems) {
        return elems[1];
      }).then(function(elem) {
        return browser
          .active().equals(elem).should.be.ok;
      }).nodeify(done);
  });
});
