/*global beforeEach:true */
"use strict";

var env = require("../../helpers/env")
  , setup = require("../common/setup-base");

var desired;
if (env.DEVICE === 'selendroid' || env.DEVICE === 'android') {
  var appPath = 'sample-code/apps/' +
      'io.appium.gappium.sampleapp/platforms/android/ant-build/' +
      'HelloGappium-debug.apk',
  desired = {
    app: appPath,
    appPackage: 'io.appium.gappium.sampleapp',
    appActivity: '.HelloGappium',
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
  return driver.contexts().then(function (ctxs) {
    for (var idx in ctxs) {
      var ctx = ctxs[idx];
      if (ctx.indexOf('WEBVIEW') !== -1) {
        return ctx;
      }
    }
    return 'WEBVIEW_1';
  }).then(function (ctx) {
    return driver.context(ctx).catch(function () {});
  });
};

describe("gappium @skip-ios6", function () {
  describe('HelloGappium', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    beforeEach(function (done) {
      activateWebView(driver).nodeify(done);
    });

    it('should open the app and navigate through the dialogs', function (done) {
      driver
        .sleep(3000) // timeout to visualize test execution
        .elementByCssSelector('.search-key')
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
