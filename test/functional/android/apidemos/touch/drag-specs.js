"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , wd = require("wd")
  , TouchAction = wd.TouchAction;


describe("apidemo - touch - drag", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  describe('drag', function () {
    it('should drag by pixels', function (done) {
      driver
        .elementByName("Content")
        .then(function (el) {
          return driver
            .elementByName("Animation")
            .then(function (el2) {
              var action = new TouchAction(driver);
              action.press({el: el}).moveTo({ el: el2}).release();
              return action.perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el}).perform();
        })
        .sleep(500)
        .elementByName("Drag and Drop")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el}).perform();
        })
        .sleep(500)
        .elementById("io.appium.android.apis:id/drag_dot_3")
        .then(function (dd3) {
          return driver
            .elementById("io.appium.android.apis:id/drag_dot_2")
            .then(function (dd2) {
              var action = new TouchAction(driver);
              return action.longPress({el: dd3}).moveTo({ el: dd2 }).release().perform();
            });
        })
        .sleep(1500)
        .elementById("io.appium.android.apis:id/drag_result_text").text()
          .should.become("Dropped!")
        .sleep(5000)
        .nodeify(done);
    });
  });
});
