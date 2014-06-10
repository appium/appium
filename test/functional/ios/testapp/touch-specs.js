"use strict";

var okIfAlert = require('../../../helpers/alert').okIfAlert,
    setup = require("../../common/setup-base"),
    desired = require('./desired'),
    TouchAction = require('wd').TouchAction,
    MultiAction = require('wd').MultiAction;

describe('testapp - touch actions', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  function goToMap() {
    return driver
      .elementByXPathOrNull('//UIAMapView')
      .then(function (el) {
        if (!el) {
          return driver.elementsByClassName('UIAButton').at(5)
          .then(function (el) {
            var tap = (new TouchAction(driver)).tap({el: el});
            return driver.performTouchAction(tap);
          }).sleep(500)
          .then(function () { okIfAlert(driver); })
          .sleep(500);
        }
      });
  }
  describe('tap', function () {
    it('should tap on a specified element', function (done) {
      driver
        .elementsByClassName('UIAButton').at(3)
        .then(function (el) {
          var tap = (new TouchAction()).tap({el: el});
          return driver.performTouchAction(tap);
        }).sleep(1000).then(function () { okIfAlert(driver); })
        .elementsByClassName('UIAButton').at(3)
        .then(function (el) {
            var tap = (new TouchAction(driver)).tap({el: el});
            return tap.perform();
        }).sleep(1000).then(function () { okIfAlert(driver); })
       .nodeify(done);
    });
  });

  describe('swipe', function () {
    it('should move the page', function (done) {
      driver
        .resolve(goToMap())
        .elementByXPath('//UIAMapView')
        .then(function (el) {
          return driver.performTouchAction((new TouchAction())
            .press({el: el}).moveTo({el: el, x: 0, y: 100 }).release());
        }).sleep(5000)
        .nodeify(done);
    });
  });

  describe('wait', function () {
    it('should move the page and wait a bit', function (done) {
      driver
        .resolve(goToMap())
        .elementByXPath('//UIAMapView')
        .then(function (el) {
          return driver.performTouchAction(
            new TouchAction().press({el: el}).moveTo({el: el, x: 0, y: 100 })
              .wait({ ms: 5000 }).moveTo({el: el, x: 0, y: 0 }).release());
        }).sleep(5000)
        .nodeify(done);
    });
  });

  describe('pinch', function () {
    it('should do some pinching', function (done) {
      driver
        .resolve(goToMap())
        .elementByXPath('//UIAMapView')
        .then(function (el) {
          var multiAction = (new MultiAction()).add(
            (new TouchAction()).press({el: el}).moveTo({el: el, x: 0, y: 0 }).release(),
            (new TouchAction()).press({el: el}).moveTo({el: el, x: 100, y: 100 }).release()
          );
          return driver
            .performMultiAction(multiAction);
        })
        .sleep(5000)
        .nodeify(done);
    });

    it('should do more involved pinching in and out', function (done) {
      driver
        .resolve(goToMap())
        .elementByXPath('//UIAMapView')
        .then(function (el) {
          var multiAction = (new MultiAction()).add(
            (new TouchAction()).press({el: el}).moveTo({el: el, x: 25, y: 25 })
              .wait(3000).moveTo({el: el, x: 100, y: 100 }).release(),
            (new TouchAction()).press({el: el}).moveTo({el: el, x: 100, y: 0 })
              .wait({ ms: 3000 }).moveTo({el: el, x: 0, y: 0 }).release()
          );
          return driver.performMultiAction(multiAction);
        })
        .sleep(5000)
        .nodeify(done);
    });
  });
});
