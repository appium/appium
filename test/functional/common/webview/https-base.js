"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    loadWebView = webviewHelper.loadWebView;

module.exports = function (desired) {

  if (desired.app === "iwebview") {
    describe('https', function () {
      var driver;
      setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });
      it('should be able to test self-signed pages', function (done) {
        loadWebView(desired, driver, 'https://selfsigned.buildslave.saucelabs.com',
          "Sauce Labs")
        .nodeify(done);
      });
    });
  }
};
