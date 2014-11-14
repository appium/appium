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

  // these tests need to be moved out of "clear-specs", and consolidated with the
  // UICatalog ones

  it('should hide keyboard using "Done" key', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard("Done")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  it('should hide keyboard using "pressKey" strategy with "Done" key', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'pressKey', key: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  it('should hide keyboard using "pressKey" strategy with "Done" keyName', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'pressKey', keyName: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  it('should hide keyboard using "press" strategy with "Done" key', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'press', key: "Done"} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

  // swipedown just doesn't work with testapp
  it.skip('should hide keyboard using "swipeDown" strategy', function (done) {
    driver
      .elementByClassName('UIATextField').sendKeys("1")
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(false)
      .hideKeyboard({strategy: 'swipeDown'} )
      .elementByClassName('UIASwitch').isDisplayed()
        .should.become(true)
      .nodeify(done);
  });

});
