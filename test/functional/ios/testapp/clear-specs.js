"use strict";

var setup = require("../../common/setup-base")
 ,  desired = require('./desired');

describe('testapp - clear', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should clear the text field', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("some-value").text()
        .should.become("some-value")
      .elementByClassName('UIATextField').clear().text().should.become('')
      .nodeify(done);
  });

  // Tap outside hide keyboard strategy can only be tested in UICatalog

  it.only('should hide keyboard using key', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard("Done")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)

      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'pressKey', key: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)

      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'pressKey', keyName: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)

      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'press', key: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)

      .nodeify(done);
  });

});
