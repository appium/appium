"use strict";

var setup = require('./setup');

describe('moveTo and click', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should be able to click on arbitrary x-y elements', function(done) {
    browser
      .elementByTagName('tableCell').moveTo(10, 10).click()
      .elementByXPath("button[@name='Rounded']")
        .should.eventually.exist
      .nodeify(done);
  });
});
