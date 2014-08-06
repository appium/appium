"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , droidText = 'android.widget.TextView'
  , TouchAction = wd.TouchAction
  , _ = require('underscore');


describe("apidemo - touch - tap", function () {
  var driver;
  setup(this, _.defaults({
    appActivity: '.text.LogTextBox1'
  }, desired)).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return driver.resetApp();
    });
  }

  describe('tap visible element', function () {
    it('should tap an element', function (done) {
      driver
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el }).perform();
        })
        .elementsByClassName(droidText)
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\n")
        .nodeify(done);
    });

    it('should tap an element from an offset', function (done) {
      driver
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el, x: 1, y: 1 }).perform();
        })
        .elementsByClassName(droidText)
        .then(function (els) {
          return els[1];
        })
        .text()
        .should.become("This is a test\n")
        .nodeify(done);
    });

    it('should tap an element twice', function (done) {
      driver
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el, count: 2 }).perform();
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
        .elementByName("Add")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.tap({el: el, x:1, y: 1, count: 2 }).perform();
        })
        .sleep(2000)
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
