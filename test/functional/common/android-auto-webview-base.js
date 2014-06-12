"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , safeClear = require('../../helpers/safe-clear');

var desired = {
  app: "sample-code/apps/selendroid-test-app.apk",
  appPackage: 'io.selendroid.testapp',
  appActivity: '.WebViewActivity',
  autoWebview: true
};
if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

module.exports = function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should go directly into webview', function (done) {
    var el;
    driver
      .elementById('name_input')
      .then(function (_el) { el = _el; })
      .then(function () { return safeClear(el); })
      .then(function () { return el.type("Appium User")
        .getValue().should.become("Appium User"); })
      .elementByCssSelector('input[type=submit]').click()
      .waitForElementByXPath("//h1[contains(., 'This is my way')]")
      .nodeify(done);
  });
};
