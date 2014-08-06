"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    actions = require("./helpers/actions"),
    serverConfigs = require('./helpers/appium-servers');

wd.addPromiseChainMethod('swipe', actions.swipe);
wd.addPromiseChainMethod('pinch', actions.pinch);
wd.addElementPromiseChainMethod('pinch',
  function () { return this.browser.pinch(this); });
wd.addPromiseChainMethod('zoom', actions.zoom);
wd.addElementPromiseChainMethod('zoom',
  function () { return this.browser.zoom(this); });

describe("ios actions", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = _.clone(require("./helpers/caps").ios71);
    desired.app = require("./helpers/apps").iosTestApp;
    if (process.env.SAUCE) {
      desired.name = 'ios - actions';
      desired.tags = ['sample'];
    }
    return driver.init(desired);
  });

  after(function () {
    return driver
      .quit()
      .finally(function () {
        if (process.env.SAUCE) {
          return driver.sauceJobStatus(allPassed);
        }
      });
  });

  afterEach(function () {
    allPassed = allPassed && this.currentTest.state === 'passed';
  });

  it("should execute a simple action", function () {
    return driver.chain()
      .elementByAccessibilityId('ComputeSumButton')
      .then(function (el) {
        var action = new wd.TouchAction(driver);
        action
          .tap({el: el, x: 10, y: 10})
          .release();
        return driver.performTouchAction(action);
      })
      .elementByAccessibilityId('ComputeSumButton')
      .then(function (el) {
        var action = new wd.TouchAction(driver);
        action
          .tap({el: el, x: 10, y: 10})
          .release();
        return action.perform();
      });
  });

  it("should execute a multi action", function () {
    return driver.chain()
      .then(function () {
        return driver
          .elementByAccessibilityId('ComputeSumButton')
          .then(function (el) {
            var a1 = new wd.TouchAction();
            a1
              .tap({el: el, x: 10, y: 10});
            var a2 = new wd.TouchAction();
            a2
              .tap({el: el});
            var m = new wd.MultiAction();
            m.add(a1, a2);
            return driver.performMultiAction(m);
          });
      })
      .then(function () {
        return driver
          .elementByAccessibilityId('ComputeSumButton')
          .then(function (el) {
            var a1 = new wd.TouchAction();
            a1
              .tap({el: el, x: 10, y: 10});
            var a2 = new wd.TouchAction();
            a2
              .tap({el: el});
            var m = new wd.MultiAction(driver);
            m.add(a1, a2);
            return m.perform();
          });
      });
  });

  it("should swipe", function () {
    return driver
      .waitForElementByName('Test Gesture', 5000).click()
      .sleep(1000)
      .elementByName('OK').click()
      .sleep(1000)
      .elementByXPath('//UIAMapView').getLocation()
      .then(function (loc) {
        return driver.swipe({ startX: loc.x, startY: loc.y,
          endX: 0.5,  endY: loc.y, duration: 800 });
      });
  });

  it("should pinch", function () {
    return driver
      .waitForElementByName('Test Gesture', 5000).click()
      .sleep(1000)
      .elementByName('OK').click()
      .sleep(1000)
      .elementByXPath('//UIAMapView')
      .then(function (el) {
        return driver.pinch(el);
      });
  });

  it("should pinch el", function () {
    return driver
      .waitForElementByName('Test Gesture', 5000).click()
      .sleep(1000)
      .elementByName('OK').click()
      .sleep(1000)
      .elementByXPath('//UIAMapView')
      .then(function (el) {
        return el.pinch();
      });
  });

  it("should zoom", function () {
    return driver
      .waitForElementByName('Test Gesture', 5000).click()
      .sleep(1000)
      .elementByName('OK').click()
      .sleep(1000)
      .elementByXPath('//UIAMapView')
      .then(function (el) {
        return driver.zoom(el);
      });
  });

  it.only("should zoom el", function () {
    return driver
      .waitForElementByName('Test Gesture', 5000).click()
      .sleep(1000)
      .elementByName('OK').click()
      .sleep(1000)
      .elementByXPath('//UIAMapView')
      .then(function (el) {
        return el.zoom();
      });
  });

});
