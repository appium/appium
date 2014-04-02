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
        .elementsByTagName('button').then(function (buttons) { return buttons[3].click(); })
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
describe('touch actions', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  describe('tap', function () {
    it('should tap on a specified element', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) {
          var el = buttons[3];
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(1000).then(function () { okIfAlert(driver); })
        .sleep(15000)
        .nodeify(done);
    });
  });

  describe('swipe', function () {
    it('should move the page', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) {
          var el = buttons[3];
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500).then(function () { okIfAlert(driver); })
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().moveTo({ x: 0, y: 100 }).release().perform();
        })
        .sleep(15000)
        .nodeify(done);
    });
  });

  describe('wait', function () {
    it('should move the page and wait a bit', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) {
          var el = buttons[3];
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500).then(function () { okIfAlert(driver); })
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
        .then(function (el) {
          var action = new TouchAction(el);
          return action.press().moveTo({ x: 0, y: 100 }).wait({ ms: 5000 }).moveTo({ x: 0, y: -100 }).release().perform();
        })
        .sleep(15000)
        .nodeify(done);
    });
  });

  describe('pinch', function () {
    it('should do some pinching', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) {
          var el = buttons[3];
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500).then(function () { okIfAlert(driver); })
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
        .then(function (el) {
          var a1 = new TouchAction(el);
          a1.press().moveTo({ x: -100, y: 0 }).release();

          var a2 = new TouchAction(el);
          a2.press().moveTo({ x: 100, y: 0 }).release();

          var ma = new MultiAction(el);
          ma.add(a1, a2);
          ma.perform();
        })
        .sleep(15000)
        .nodeify(done);
    });

    it('should do more involved pinching in and out', function (done) {
      driver
        .elementsByTagName('button').then(function (buttons) {
          var el = buttons[3];
          var action = new TouchAction(el);
          return action.tap().perform();
        })
        .sleep(500).then(function () { okIfAlert(driver); })
        .sleep(500)
        .elementByXPath('//window[1]/UIAMapView[1]')
        .then(function (el) {
          var a1 = new TouchAction(el);
          a1.press().moveTo({ x: -100, y: 0 }).wait(3000).moveTo({ x: 100, y: 0 }).release();

          var a2 = new TouchAction(el);
          a2.press().moveTo({ x: 100, y: 0 }).wait({ ms: 3000 }).moveTo({ x: -100, y: 0 }).release();

          var ma = new MultiAction(el);
          ma.add(a1, a2);
          ma.perform();
        })
        .sleep(15000)
        .nodeify(done);
    });
  });
});
