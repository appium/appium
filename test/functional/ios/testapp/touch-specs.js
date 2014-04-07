"use strict";

var okIfAlert = require('../../../helpers/alert').okIfAlert,
    setup = require("../../common/setup-base"),
    desired = require('./desired'),
    TouchAction = require('wd').TouchAction,
    MultiAction = require('wd').MultiAction;

describe('testapp - pinch gesture -', function () {

  describe('pinchOpen and pinchClose gesture', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should pinchOpen and pinchClose map after tapping Test Gesture', function (done) {
      driver
        .elementsByTagName('button').at(5).click()
        .sleep(1000).then(function () { okIfAlert(driver); })
        .elementByXPath('//window[1]/UIAMapView[1]')
        .execute("mobile: pinchOpen", [{startX: 114.0, startY: 198.0, endX: 257.0,
          endY: 256.0, duration: 5.0}])
        .elementByXPath('//window[1]/UIAMapView[1]')
        .execute("mobile: pinchClose", [{startX: 114.0, startY: 198.0, endX: 257.0,
          endY: 256.0, duration: 5.0}])
        .nodeify(done);
    });
  });
});

// most of these tests do not actually test anything.
// They need to be watched to make sure they are doing something right/wrong.
describe('testapp - touch actions @skip-ios-all -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });
  var tap = (new TouchAction()).tap();

  describe('tap', function () {
    it('should tap on a specified element', function (done) {
      driver
        .elementsByTagName('button').at(3)
          .performTouch(tap)
        .sleep(1000).then(function () { okIfAlert(driver); })
        .elementsByTagName('button').at(3)
          .then(function (el) { return el.performTouch(tap); })
        .sleep(1000).then(function () { okIfAlert(driver); })
        .elementsByTagName('button').at(3)
          .then(function (el) { return tap.performOn(el); })
        .sleep(1000).then(function () { okIfAlert(driver); })
        .sleep(3000)
        .nodeify(done);
    });
  });

  describe('swipe', function () {
    it('should move the page', function (done) {
      driver
        .elementsByTagName('button').at(5)
          .performTouch(tap)
        .sleep(500).then(function () { okIfAlert(driver); })
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
          .performTouch((new TouchAction()).press().moveTo({ x: 0, y: 100 }).release())
        .sleep(15000)
        .nodeify(done);
    });
  });

  describe('wait', function () {
    it('should move the page and wait a bit', function (done) {
      driver
        .elementByXPath('//window[1]/UIAMapView[1]')
          .performTouch(new TouchAction().press().moveTo({ x: 0, y: 100 })
            .wait({ ms: 5000 }).moveTo({ x: 0, y: -100 }).release())
        .sleep(15000)
        .nodeify(done);
    });
  });

  describe('pinch', function () {
    it('should do some pinching', function (done) {
      var multiAction = (new MultiAction()).add(
        (new TouchAction()).press().moveTo({ x: -100, y: 0 }).release(),
        (new TouchAction()).press().moveTo({ x: 100, y: 0 }).release()
      );
      driver
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
          .performTouch(multiAction)
        .sleep(15000)
        .nodeify(done);
    });

    it('should do more involved pinching in and out', function (done) {
      var multiAction = (new MultiAction()).add(
        (new TouchAction()).press().moveTo({ x: -100, y: 0 }).wait(3000).moveTo({ x: 100, y: 0 }).release(),
        (new TouchAction()).press().moveTo({ x: 100, y: 0 }).wait({ ms: 3000 }).moveTo({ x: -100, y: 0 }).release()
      );
      driver
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
          .performTouch(multiAction)
        .sleep(15000)
        .nodeify(done);
    });
  });
});
