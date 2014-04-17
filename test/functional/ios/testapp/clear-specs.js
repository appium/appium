"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - clear -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should clear the text field', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("some-value").text()
        .should.become("some-value")
      .elementByClassName('UIATextField').clear().text().should.become('')
      .nodeify(done);
  });

  it('should hide keyboard using default strategy @skip-ios-all', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard()
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  it('should hide keyboard using keyName', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard("Done")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

});
