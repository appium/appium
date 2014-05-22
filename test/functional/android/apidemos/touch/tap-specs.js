"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , droidText = 'android.widget.TextView'
  , TouchAction = wd.TouchAction;


describe("apidemo - touch - tap", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function (done) {
      driver.resetApp().nodeify(done);
    });
  }

  describe('tap visible element', function () {
    it('should tap an element', function (done) {
      driver.elementByName("Animation")
        .then(function (el) {
          return (new TouchAction()).tap().performOn(el);
        })
        .elementsByClassName(droidText).then(function (els) { return els[1]; })
          .text().should.become("Bouncing Balls")
        .nodeify(done);
    });

    it('should tap an element from an offset', function (done) {
      driver.elementByName("Animation")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap({ x: 1, y: 1 }).performOn(el);
        })
        .elementsByClassName(droidText).then(function (els) { return els[1]; })
          .text().should.become("Bouncing Balls")
        .nodeify(done);
    });

    it('should tap an element twice', function (done) {
      driver
        .elementByName("Text")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .elementByName("LogTextBox")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap({ count: 2 }).performOn(el);
        })
        .elementsByClassName(droidText)
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\nThis is a test\n")
        .nodeify(done);
    });

    it('should tap an element from an offset twice', function (done) {
      driver
        .elementByName("Text")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .elementByName("LogTextBox")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap().performOn(el);
        })
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction();
          return action.tap({ count: 2 }).performOn(el);
        })
        .elementsByClassName(droidText)
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\nThis is a test\n")
        .nodeify(done);
    });
  });
});
