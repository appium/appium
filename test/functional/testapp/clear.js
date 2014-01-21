"use strict";

var setup = require('./setup');

describe('clear', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should clear the text field', function(done) {
    browser
      .elementByTagName('textField').sendKeys("some-value").text()
        .should.become("some-value")
      .elementByTagName('textField').clear().text().should.become('')
      .nodeify(done);
  });

  it('should hide keyboard', function(done) {
    browser
      .elementByTagName('textField').sendKeys("1")
      .elementByTagName('slider').click()
        .should.be.rejected
      .execute("mobile: hideKeyboard", [{keyName: "Done"}])
      .elementByTagName('slider').click()
      .nodeify(done);
  });

});
