"use strict";


var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView,
    wd = require("wd"),
    TouchAction = wd.TouchAction,
    MultiAction = wd.MultiAction,
    _ = require("underscore");

module.exports = function (desired) {

  describe('touch actions', function () {
    var driver;
    setup(this, _.defaults({
      'noReset': true
    }, desired)).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });

    it('should not be able to do native touch actions', function (done) {
      driver
        .elementById('comments')
          .then(function (el) {
            var action = new TouchAction(driver);
            action.tap({
              el: el,
              count: 10
            });
            return action.perform();
          })
        .should.be.rejectedWith("status: 13")
        .nodeify(done);
    });

    it('should not be able to do native multi touch actions', function (done) {
      driver
        .elementById('comments')
          .then(function (el) {
            var action = new TouchAction(driver);
            action.tap({
              el: el,
              count: 10
            });
            var ma = new MultiAction(driver);
            ma.add(action, action);
            return ma.perform();
          })
        .should.be.rejectedWith("status: 13")
        .nodeify(done);
    });
  });
};
