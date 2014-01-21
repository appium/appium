"use strict";

var setup = require('./setup');

describe('element size', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should return the right element size', function(done) {
    browser.elementByTagName('button').getSize().then(function(size) {
      size.width.should.eql(113);
      size.height.should.eql(37);
    }).nodeify(done);
  });

  it('should return the window size', function(done) {
    browser.getWindowSize().then(function(size) {
      size.width.should.be.above(319);
      size.height.should.be.above(479);
    }).nodeify(done);
  });
});
