/*
  The appium specific methods are not yet implemented by selenium-webdriver.
  However it is possible to attach an existing selenium-webdriver session to
  a wd browser instance as below.

  prerequisites:
    npm install selenium-webdriver
*/

"use strict";

require("./helpers/setup");

var webdriver = require('selenium-webdriver'),
    wd = require("wd"),
    wdBridge = require('wd-bridge')(webdriver, wd),
    _ = require('underscore'),
    Q = require('q'),
    chai = require('chai');
chai.should();

describe("ios simple", function () {
  this.timeout(300000);
  var driver;
  var wdDriver;
  var allPassed = true;

  before(function () {
    var builder;
    var caps = new webdriver.Capabilities();

    _(require("./helpers/caps").ios71).each(function (val, key) {
      caps.set(key, val);
    });
    caps.set('app', require("./helpers/apps").iosTestApp);
    if (process.env.SAUCE) {
      caps.set('username', process.env.SAUCE_USERNAME);
      caps.set('accessKey', process.env.SAUCE_ACCESS_KEY);
      caps.set('name', 'ios - selenium-webdriver bridge');
      caps.set('tags', ['sample']);
      builder = new webdriver.Builder()
        .usingServer('http://ondemand.saucelabs.com:80/wd/hub')
        .withCapabilities(caps);
    } else {
      builder = new webdriver.Builder()
        .usingServer('http://localhost:4723/wd/hub')
        .withCapabilities(caps);
    }
    driver = builder.build();
    return wdBridge
      .initFromSeleniumWebdriver(builder, driver)
      .then(function (_wdDriver) {
        wdDriver = _wdDriver;
        require("./helpers/logging").configure(wdDriver);
      });
  });

  after(function () {
    return new Q(driver
      .quit())
      .finally(function () {
        if (process.env.SAUCE) {
          return wdDriver.sauceJobStatus(allPassed);
        }
      });
  });

  afterEach(function () {
    allPassed = allPassed && this.currentTest.state === 'passed';
  });

  function populate() {
    var sum = 0;
    var populateField = function (name) {
      return driver.wait(function () {
        return driver.findElement(webdriver.By.name(name));
      }, 3000).then(function (el) {
        var x = _.random(0,10);
        sum += x;
        return el.sendKeys('' + x);
      }).then(function () {
        return driver.findElement(webdriver.By.name('Done'));
      }).then(function (el) {
        // converting to wd el
        return wdDriver.wdEl(el).click();
      }).then(function () { return driver.sleep(1000); });
    };
    return populateField('IntegerA')
      .then(function () { return populateField('IntegerB'); })
      .then(function () { return sum; });
  }

  it("should compute the sum", function () {
    var sum;
    return populate()
      .then(function (_sum) {
        sum = _sum;
        // using appium specific methods to find a click the button
        return wdDriver.
          elementByAccessibilityId('ComputeSumButton')
            .click().sleep(1000);
      }).then(function () {
        return wdDriver
          .elementByIosUIAutomation('elements().withName("Answer");')
          .then(function (el) {
            // converting from wd el
            return wdDriver.swEl(el).getText();
          });
      }).then(function (text) {
        text.should.equal("" + sum);
      });
  });

});
