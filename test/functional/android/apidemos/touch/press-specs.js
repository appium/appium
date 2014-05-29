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
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .elementByName("Sample menu").should.be.rejected
        .nodeify(done);
    });

    it('should work like `longPress` when released after a pause', function (done) {
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
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction();
          return action.press().release().performOn(el);
        })
        .sleep(500)
        .elementByName("People Names") //.should.eventually.exist
        .then(function (el) {
          var action = new TouchAction();
          return action.press().wait(1000).release().performOn(el);
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('longPress', function () {
    it('should open a context menu', function (done) {
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
        .elementByName("Views")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .sleep(500)
        .elementByName("Expandable Lists")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .sleep(500)
        .elementByName("1. Custom Adapter")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .sleep(500)
        .elementByName("People Names")
        .then(function (el) {
          var action = new TouchAction();
          return action.longPress().release().performOn(el);
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });
});
