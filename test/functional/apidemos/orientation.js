"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired");

describe('orientation', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  if (process.env.FAST_TESTS) {
    afterEach(function(done) {
      browser.getOrientation().then(function(orientation) {
        if (orientation !== "PORTRAIT") {
          return browser.setOrientation("PORTRAIT");
        }
      }).nodeify(done);
    });
  }
  
  it('should rotate screen to landscape', function(done) {
    browser
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .getOrientation().should.become("LANDSCAPE")
      .nodeify(done);
  });
  it('should rotate screen to portrait', function(done) {
    browser
      .setOrientation("LANDSCAPE")
      .sleep(3000)
      .setOrientation("PORTRAIT")
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
  it('Should not error when trying to rotate to portrait again', function(done) {
    browser
      .setOrientation("PORTRAIT")
      .sleep(3000)
      .getOrientation().should.become("PORTRAIT")
      .nodeify(done);
  });
});
