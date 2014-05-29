"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , reset = require("../reset")
  , wd = require("wd")
  , TouchAction = wd.TouchAction;


describe("apidemo - touch - swipe", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return reset(driver);
    });
  }

  describe('swipe', function () {
    it('should be possible with press/moveTo/release', function (done) {
      driver.elementByName("Content")
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
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });

    it('should be possible with press/moveTo/release and pixel offset', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction();
          action.press().moveTo({ x: 0, y: -400 }).release().performOn(el);
        })
        .sleep(500)
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });
  });
});
