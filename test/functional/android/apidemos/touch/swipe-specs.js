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
          var action = new TouchAction(driver);
          action.press({el: el});
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({el: el2}).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });

    it('should be possible with press/moveTo/release and pixel offset', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(driver);
          action.press({el: el}).moveTo({x: 0, y: -400 }).release().perform();
        })
        .sleep(3000)
        .elementByName("Views").should.eventually.exist
        .nodeify(done);
    });
  });
});
