"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView,
    isChrome = webviewHelper.isChrome;

module.exports = function (desired) {

  describe('window title', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    beforeEach(function (done) {
      loadWebView(desired, driver).nodeify(done);
    });
    it('should return a valid title on web view', function (done) {
      driver
        .title().should.eventually.include("I am a page title")
        .then(function () {
          if (isChrome(desired)) {
            return;
          }
          return driver
            .execute("mobile: leaveWebView")
            .title()
            .should.be.rejectedWith(/status: 13/);
        }).nodeify(done);
    });
  });
};
