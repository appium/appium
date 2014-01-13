"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('clear', function(h) {
  it('should clear the text field', function(done) {
    h.driver
      .elementByTagName('textField').sendKeys("some-value").text()
        .should.become("some-value")
      .elementByTagName('textField').clear().text().should.become('')
      .nodeify(done);
  });

  it('should hide keyboard', function(done) {
    h.driver
      .elementByTagName('textField').sendKeys("1")
      .elementByTagName('slider').click()
        .should.be.rejected
      .execute("mobile: hideKeyboard", [{keyName: "Done"}])
      .elementByTagName('slider').click()
      .nodeify(done);
  });

});
