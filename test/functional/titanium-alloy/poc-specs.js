// Run with:
// DEVICE=ios81 mocha test/functional/titanium-alloy/poc-specs.js
// DEVICE=android mocha test/functional/titanium-alloy/poc-specs.js

"use strict";

var env = require('../../helpers/env'),
    setup = require('./setup-base');

describe('titanium-alloy - poc', function () {

  var driver, codeInjector;
  setup(this).spread(function (_driver, _codeInjector) {
    driver = _driver;
    codeInjector = _codeInjector;
  });

  describe('Checking the value of a static field', function () {
    // inject client code
    before(function () {
      return codeInjector.injectCode(driver, function (testView) {
        /* global Ti  */
        console.log('Hey I am running some real code here!');
        var label = Ti.UI.createLabel({
          color:'purple',
          text: 'Wow I was generated dynamically!',
          accessibilityLabel: 'dynamicLabel',
          accessibilityValue: 'Wow I was generated dynamically!',
          textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
          top: '40%',
          width: 'auto',
          height: 'auto'
        });
        testView.add(label);
      });
    });
    // run test
    if (env.IOS) {
      it.only('should-work', function () {
        return driver
          .waitForElementById('dynamicLabel')
            .should.eventually.exist
          .source().print()
          .waitForElementById('dynamicLabel').getValue()
            .should.become('Wow I was generated dynamically!');
      });
    } else if (env.ANDROID) {
      it.only('should-work', function () {
        return driver
          .waitForElementByAndroidUIAutomator(
            'new UiSelector().descriptionContains("dynamicLabel")')
            .should.eventually.exist
          .source().print()
          .waitForElementByAndroidUIAutomator(
              'new UiSelector().descriptionContains("dynamicLabel")').text()
            .should.become('Wow I was generated dynamically!');
      });
    }
    // cleanup
    after(function () {
      return codeInjector.clearCode(driver);
    });
  });

});

