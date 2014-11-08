// Run with:
// DEVICE=ios81 mocha test/functional/dynamic-app/poc-specs.js
// DEVICE=android mocha test/functional/dynamic-app/poc-specs.js

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
          top: (20 + Math.floor(Math.random()*40)) + '%',
          width: 'auto',
          height: 'auto'
        });
        testView.add(label);
      });
    });
    // run test
    if (env.IOS) {
      it('should-work', function () {
        return driver
          .waitForElementById('dynamicLabel')
            .should.eventually.exist
          .source().print()
          .waitForElementById('dynamicLabel').getValue()
            .should.become('Wow I was generated dynamically!');
      });
    } else if (env.ANDROID) {
      it('should-work', function () {
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

  describe('Clearing center aligned field', function () {
    // inject client code
    before(function () {
      return codeInjector.injectCode(driver, function (testView) {
        /* global Ti  */
        var textField = Ti.UI.createTextField({
          accessibilityLabel: 'theTextField',
          borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
          borderColor: 'black',
          textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER,
          top: '40%',
          width: '300',
          height: 'auto',
          color: 'black',
          value: 'Some random text.',
        });
        testView.add(textField);
      });
    });

    if (env.ANDROID) {
      // bug repro, need fixing
      it.skip('should-work', function () {
        var el;
        return driver
          .sleep(2000)
          .waitForElementByAndroidUIAutomator(
            'new UiSelector().descriptionContains("theTextField")')
          .then(function (_el) {
            el = _el;
            return el.text()
              .should.become('Some random text.');
          }).then(function () { return el.clear(); })
          .sleep(2000)
          .then(function () { return el.text().should.become(''); })
          .sleep(2000);
      });
    }
    // cleanup
    after(function () {
      return codeInjector.clearCode(driver);
    });
  });

});

