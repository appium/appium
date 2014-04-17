"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - clear -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should clear the text field', function (done) {
    driver
      .elementByTagName('textField').sendKeys("some-value").text()
        .should.become("some-value")
      .elementByTagName('textField').clear().text().should.become('')
      .nodeify(done);
  });

  it('should hide keyboard using default strategy @skip-ios-all', function (done) {
    driver
      .elementByTagName('textField').sendKeys("1")
      .elementByTagName('switch').isDisplayed()
        .should.become(false)
      .hideKeyboard()
      .elementByTagName('switch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  it('should hide keyboard using keyName', function (done) {
    driver
      .elementByTagName('textField').sendKeys("1")
      .elementByTagName('switch').isDisplayed()
        .should.become(false)
      .hideKeyboard("Done")
      .elementByTagName('switch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

});
