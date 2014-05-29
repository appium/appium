"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView;

module.exports = function (desired) {

  describe("executeAsync", function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });
    it("should bubble up javascript errors", function (done) {
      driver
        .executeAsync("'nan'--")
          .should.be.rejectedWith(/status: (13|17)/)
        .nodeify(done);
    });
    it("should execute async javascript", function (done) {
      driver
        .setAsyncScriptTimeout(10000)
        .executeAsync("arguments[arguments.length - 1](123);")
          .should.become(123)
      .nodeify(done);
    });
    it("should timeout when callback isn't invoked", function (done) {
      driver
        .setAsyncScriptTimeout(2000)
        .executeAsync("return 1 + 2")
          .should.be.rejectedWith(/status: 28/)
      .nodeify(done);
    });
  });
};
