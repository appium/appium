"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , asserters = wd.asserters
  , TouchAction = wd.TouchAction
  , _ = require('underscore');


describe("apidemo - touch - drag", function () {
  var driver;
  setup(this, _.defaults({
    appActivity: '.view.DragAndDropDemo'
  }, desired)).then(function (d) { driver = d; });

  describe('drag', function () {
    var last = false;
    afterEach(function () {
      if (!last) {
        return driver.resetApp();
      }
    });

    it('should drag by element', function (done) {
      driver
        .elementById("io.appium.android.apis:id/drag_dot_3")
        .then(function (dd3) {
          return driver
            .elementById("io.appium.android.apis:id/drag_dot_2")
            .then(function (dd2) {
              var action = new TouchAction(driver);
              return action.longPress({el: dd3}).moveTo({ el: dd2 }).release().perform();
            });
        })
        .waitForElementById("io.appium.android.apis:id/drag_result_text", asserters.textInclude('Dropped'), 2000)
        .nodeify(done);
    });

    it('should drag by element with an offset', function (done) {
      driver
        .elementById("io.appium.android.apis:id/drag_dot_3")
        .then(function (dd3) {
          return driver
            .elementById("io.appium.android.apis:id/drag_dot_2")
            .then(function (dd2) {
              var action = new TouchAction(driver);
              return action.longPress({
                el: dd3,
                x: 5,
                y: 5
              }).moveTo({
                el: dd2,
                x: 5,
                y: 5
              }).release().perform();
            });
        })
        .waitForElementById("io.appium.android.apis:id/drag_result_text", asserters.textInclude('Dropped'), 2000)
        .nodeify(done);
    });

    it('should drag by absolute position', function (done) {
      last = true;
      var startEl
        , startLoc
        , startSize
        , endEl
        , endLoc
        , endSize;
      driver
        .elementById("io.appium.android.apis:id/drag_dot_3")
          .then(function (_el) {
            startEl = _el;
            return startEl;
          })
        .getLocationInView()
          .then(function (_startLoc) {
            startLoc = _startLoc;
            return startEl;
          })
        .getSize()
          .then(function (_startSize) {
            startSize = _startSize;
          })
        .elementById("io.appium.android.apis:id/drag_dot_2")
          .then(function (_el) {
            endEl = _el;
            return endEl;
          })
        .getLocationInView()
          .then(function (_endLoc) {
            endLoc = _endLoc;
            return endEl;
          })
        .getSize()
          .then(function (_endSize) {
            endSize = _endSize;
          })
        .then(function () {
          var action = new TouchAction(driver);
          return action.longPress({
            x: startLoc.x + (startSize.width / 2),
            y: startLoc.y + (startSize.height / 2)
          }).moveTo({
            x: endLoc.x + (endSize.width / 2),
            y: endLoc.y + (endSize.height / 2)
          }).release().perform();
        })
        .waitForElementById("io.appium.android.apis:id/drag_result_text", asserters.textInclude('Dropped'), 2000)
        .nodeify(done);
    });
  });
});
