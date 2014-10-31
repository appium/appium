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

  var getNumericValue = function (pctVal) {
    pctVal = pctVal.replace("%", "");
    pctVal = parseInt(pctVal, 10);
    return pctVal;
  };

  var testSliderValueNear50 = function (value) {
    value = getNumericValue(value);
    // should be ~50
    value.should.be.above(45);
    value.should.be.below(55);
  };

  describe('swipe', function () {
    it("should work with element, absolute, or relative coordinates.", function (done) {
      var slider, destEl, x = 0, y = 0;
      var leftPos = { x: 0, y: 0 },
        rightPos = { x: 0, y: 0 },
        centerPos = { x: 0, y: 0 };
      driver
        .elementByClassName("UIASlider")
        .then(function (el) { slider = el; return slider; })
        .getLocation()
        .then(function (loc) {x = loc.x; y = loc.y; return slider;})
        .getSize()
        .then(function (re) {
          leftPos.x = x - 5;
          centerPos.x = x + (re.width * 0.5);
          rightPos.x = x + re.width + 5;
          leftPos.y = rightPos.y = centerPos.y = y + (re.height * 0.5);
        })
        .elementByAccessibilityId("Access'ibility")
          .then(function (el) { destEl = el;})
        .then(function () { return slider.getAttribute("value"); })
        .then(testSliderValueNear50)

        // test: press {element}, moveTo {destEl}
        .then(function () {
          return driver.performTouchAction((new TouchAction())
            .press({el: slider}).wait({ms: 500}).moveTo({el: destEl}).release());
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueAfter.should.equal("100%");
        })
        // test: press {element, x, y}, moveTo {element, x, y}
        .then(function () {
          return driver.performTouchAction((new TouchAction())
            .press({el: slider, x: 0.8665, y: 0.5}).wait({ms: 500}).moveTo({el: slider, x: 0.5, y: 0.5}).release());
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(testSliderValueNear50)

        // test: press {x, y}, moveTo {x, y}
        .then(function () {
          return driver.performTouchAction((new TouchAction())
            .press({x: centerPos.x, y: centerPos.y}).wait({ms: 500}).moveTo({x: leftPos.x, y: leftPos.y}).release());
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueAfter.should.equal("0%");
        })
        // test: press {element, x, y}, moveTo {destEl, x, y}
        .then(function () {
          return driver.performTouchAction((new TouchAction())
            .press({el: slider, x: 0, y: 0.5}).wait({ms: 500}).moveTo({el: destEl, x: -90, y: 0.5}).release());
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(testSliderValueNear50)

        // test: press {x, y}, moveTo {destEl}
        .then(function () {
          return driver.performTouchAction((new TouchAction())
            .press({x: centerPos.x, y: centerPos.y}).wait({ms: 500}).moveTo({el: destEl}).release());
        })
        .then(function () { return slider.getAttribute("value"); })
        .then(function (valueAfter) {
          valueAfter.should.equal("100%");
        })

        .nodeify(done);
    });

    it('should move the page', function (done) {
      driver
        .resolve(goToMap())
        .elementByXPath('//UIAMapView')
        .then(function (el) {
          return driver.performTouchAction((new TouchAction())
            .press({el: el}).moveTo({el: el, x: 0, y: 100 }).release());
        })
        .sleep(5000)
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
