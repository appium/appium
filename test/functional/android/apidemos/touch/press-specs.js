"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , wd = require("wd")
  , TouchAction = wd.TouchAction
  , _ = require('underscore');


describe("apidemo - touch - press", function () {
  var driver;
  setup(this, _.defaults({
    appActivity: '.view.ExpandableList1'
  }, desired)).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    beforeEach(function () {
      return driver.resetApp();
    });
  }

  describe('press', function () {
    it('should work like `tap` when immediately released', function (done) {
      driver
        .elementByName("People Names")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).release().perform();
        })
        .elementByName("Sample menu").should.be.rejected
        .nodeify(done);
    });

    it('should work like `longPress` when released after a pause', function (done) {
      driver
        .elementByName("People Names")
        .then(function (el) {
          var action = new TouchAction(driver);
          return action.press({el: el}).wait(1000).release().perform();
        })
        .elementByName("Sample menu").should.eventually.exist
        .nodeify(done);
    });
  });

  describe('longPress', function () {
    it('should open a context menu', function (done) {
      driver
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
