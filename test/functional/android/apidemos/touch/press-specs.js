"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , TouchAction = wd.TouchAction;


describe("apidemo - touch - press", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return driver.resetApp();
    });
  }

  describe('press', function () {
    it('should work like `tap` when immediately released', function (done) {
      driver.elementByName("Content")
        .then(function (el) {
          var action = new TouchAction(driver);
          action.press({el: el});
          driver
            .elementByName("Animation")
            .then(function (el2) {
              return action.moveTo({ el: el2 }).release().perform();
            });
        })
        .sleep(500)
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .elementByName("Sample menu").should.be.rejected
        .nodeify(done);
    });

    it('should work like `longPress` when released after a pause', function (done) {
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
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).wait(1000).release().perform();
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('longPress', function () {
    it.only('should open a context menu', function (done) {
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
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el}).perform();
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el}).perform();
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el}).perform();
        })
        .sleep(500)
        .elementByName("People Names")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.longPress({el: el}).release().perform();
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });
});
