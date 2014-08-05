"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , TouchAction = wd.TouchAction
  , _ = require('underscore');


describe("apidemo - touch - drag", function () {
  var driver;
  setup(this, _.defaults({
    appActivity: '.view.DragAndDropDemo'
  }, desired)).then(function (d) { driver = d; });

  describe('drag', function () {
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
        .sleep(500)
        .elementById("io.appium.android.apis:id/drag_result_text").text()
          .should.become("Dropped!")
        .nodeify(done);
    });
  });
});
