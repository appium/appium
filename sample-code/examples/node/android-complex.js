"use strict";

require("./helpers/setup");

var wd = require("wd"),
    _ = require('underscore'),
    actions = require("./helpers/actions"),
    serverConfigs = require('./helpers/appium-servers'),
    _p = require('./helpers/promise-utils'),
    Q = require('q');

wd.addPromiseChainMethod('swipe', actions.swipe);

describe("android complex", function () {
  this.timeout(300000);
  var driver;
  var allPassed = true;

  before(function () {
    var serverConfig = process.env.SAUCE ?
      serverConfigs.sauce : serverConfigs.local;
    driver = wd.promiseChainRemote(serverConfig);
    require("./helpers/logging").configure(driver);

    var desired = process.env.SAUCE ?
      _.clone(require("./helpers/caps").android18) :
      _.clone(require("./helpers/caps").android19);
    desired.app = require("./helpers/apps").androidApiDemos;
    if (process.env.SAUCE) {
      desired.name = 'android - complex';
      desired.tags = ['sample'];
    }
    return driver
      .init(desired)
      .setImplicitWaitTimeout(5000);
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

  it("should find an element", function () {
    return driver
      .elementByXPath('//android.widget.TextView[@text=\'Animation\']')
      .elementByXPath('//android.widget.TextView')
        .text().should.become('API Demos')
      .elementsByXPath('//android.widget.TextView[contains(@text, "Animat")]')
        .then(_p.filterDisplayed).first()
      .then(function (el) {
        if (!process.env.SAUCE) {
          return el.text().should.become('Animation');
        }
      }).elementByName('App').click()
        .sleep(3000)
      .elementsByAndroidUIAutomator('new UiSelector().clickable(true)')
        .should.eventually.have.length.above(10)
      .elementByXPath('//android.widget.TextView[@text=\'Action Bar\']')
        .should.eventually.exist
      .elementsByXPath('//android.widget.TextView')
        .then(_p.filterDisplayed).first()
        .text().should.become('API Demos')
      .back().sleep(1000);
  });

  it("should scroll", function () {
    return driver
      .elementByXPath('//android.widget.TextView[@text=\'Animation\']')
      .elementsByXPath('//android.widget.TextView')
      .then(function (els) {
        return Q.all([
          els[7].getLocation(),
          els[3].getLocation()
        ]).then(function (locs) {
          console.log('locs -->', locs);
          return driver.swipe({
            startX: locs[0].x, startY: locs[0].y,
            endX: locs[1].x, endY: locs[1].y,
            duration: 800
          });
        });
      });
  });

  it("should draw a smiley", function () {
    function findTouchPaint() {
      return driver
        .elementsByClassName('android.widget.TextView')
        .then(function (els) {
          return Q.all([
            els[els.length - 1].getLocation(),
            els[0].getLocation()
          ]).then(function (locs) {
            return driver.swipe({
              startX: locs[0].x, startY: locs[0].y,
              endX: locs[1].x, endY: locs[1].y,
              duration: 800
            });
          });
        }).elementByName('Touch Paint')
        .catch(function () {
          return findTouchPaint();
        });
    }

    return driver
      .elementByName('Graphics').click()
      .then(findTouchPaint)
      .click()
      .sleep(5000)
      .then(function () {
        var a1 = new wd.TouchAction();
        a1.press({x: 150, y: 100}).release();
        var a2 = new wd.TouchAction();
        a2.press({x: 250, y: 100}).release();
        var smile = new wd.TouchAction();
        smile
          .press({x:110, y:200})
          .moveTo({x:1, y:1})
          .moveTo({x:1, y:1})
          .moveTo({x:1, y:1})
          .moveTo({x:1, y:1})
          .moveTo({x:1, y:1})
          .moveTo({x:2, y:1})
          .moveTo({x:2, y:1})
          .moveTo({x:2, y:1})
          .moveTo({x:2, y:1})
          .moveTo({x:2, y:1})
          .moveTo({x:3, y:1})
          .moveTo({x:3, y:1})
          .moveTo({x:3, y:1})
          .moveTo({x:3, y:1})
          .moveTo({x:3, y:1})
          .moveTo({x:4, y:1})
          .moveTo({x:4, y:1})
          .moveTo({x:4, y:1})
          .moveTo({x:4, y:1})
          .moveTo({x:4, y:1})
          .moveTo({x:5, y:1})
          .moveTo({x:5, y:1})
          .moveTo({x:5, y:1})
          .moveTo({x:5, y:1})
          .moveTo({x:5, y:1})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:0})
          .moveTo({x:5, y:-1})
          .moveTo({x:5, y:-1})
          .moveTo({x:5, y:-1})
          .moveTo({x:5, y:-1})
          .moveTo({x:5, y:-1})
          .moveTo({x:4, y:-1})
          .moveTo({x:4, y:-1})
          .moveTo({x:4, y:-1})
          .moveTo({x:4, y:-1})
          .moveTo({x:4, y:-1})
          .moveTo({x:3, y:-1})
          .moveTo({x:3, y:-1})
          .moveTo({x:3, y:-1})
          .moveTo({x:3, y:-1})
          .moveTo({x:3, y:-1})
          .moveTo({x:2, y:-1})
          .moveTo({x:2, y:-1})
          .moveTo({x:2, y:-1})
          .moveTo({x:2, y:-1})
          .moveTo({x:2, y:-1})
          .moveTo({x:1, y:-1})
          .moveTo({x:1, y:-1})
          .moveTo({x:1, y:-1})
          .moveTo({x:1, y:-1})
          .moveTo({x:1, y:-1})
          .release();

        var ma = new wd.MultiAction().add(a1, a2, smile);
        return driver.performMultiAction(ma)
          // so you can see it
          .sleep(10000)
          .back().sleep(1000)
          .back().sleep(1000);
      });
  });

});
