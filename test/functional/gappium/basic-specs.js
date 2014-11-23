/*global beforeEach:true */
"use strict";

var env = require("../../helpers/env")
  , setup = require("../common/setup-base")
  , ChaiAsserter = require("../../helpers/asserter").ChaiAsserter
  , _ = require('underscore')
  , desired;

if (env.DEVICE === 'selendroid' || env.DEVICE === 'android') {
  var appName = 'CordovaApp';
  var appPath = 'sample-code/apps/' +
      'io.appium.gappium.sampleapp/platforms/android/ant-build/' +
      appName + '-debug.apk',
  desired = {
    app: appPath,
    appPackage: 'io.appium.gappium.sampleapp',
    appActivity: '.' + appName,
  };
} else {
  var appPath = 'sample-code/apps/' +
      'io.appium.gappium.sampleapp/platforms/ios/build' +
      (env.EMU ? '/emulator' : '') + '/HelloGappium.app',
  desired = {
    app: appPath
  };
}

var activateWebView = function (driver) {
  var webContextReady = new ChaiAsserter(function (driver) {
    return driver
      .contexts()
      .then(function (ctxs) {
        var webviewCtx = _(ctxs).find(function (ctx) {
          return ctx.indexOf('WEBVIEW') >= 0;
        });
        webviewCtx.should.exist;
        return webviewCtx;
      });
  });
  return driver
    //TODO: how to detect app is ready on android, spinning doesn't work.
    .sleep(env.ANDROID ? 45000 : 5000) // yup takes time to load
    .waitFor(webContextReady, 10000, 500)
    .then(function (webviewCtx) {
      return driver.context(webviewCtx);
    });
};

describe("gappium", function () {
  describe('HelloGappium', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    beforeEach(function (done) {
      activateWebView(driver).nodeify(done);
    });

    it('should open the app and navigate through the dialogs', function (done) {
      driver
        .waitForElementByCssSelector('.search-key', 60000, 10000)
          .sendKeys('j')
        .elementsByCssSelector('.topcoat-list a')
        .then(function (employees) {
          employees.length.should.equal(5);
          return employees[3].click();
        }).elementsByCssSelector('.actions a')
        .then(function (options) {
          options.length.should.equal(6);
          options[3].click();
        }).sleep(2000)
        .nodeify(done); // timeout to visualize test execution

    });
  });
});
