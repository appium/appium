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
          var action = new TouchAction();
          action.press();
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ element: el2.value.toString() }).release().performOn(el);
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .sleep(500)
        .elementByName("Drag and Drop")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .sleep(500)
        .elementById("com.example.android.apis:id/drag_dot_3")
        .then(function (dd3) {
          return driver
            .elementById("com.example.android.apis:id/drag_dot_2")
            .then(function (dd2) {
              var action = new TouchAction();
              return action.longPress().moveTo({ element: dd2.value.toString() }).release().performOn(dd3);
            });
        })
        .sleep(1500)
        .elementById("com.example.android.apis:id/drag_result_text").text()
          .should.become("Dropped!")
        .sleep(15000)
        .nodeify(done);
    });
  });
});
