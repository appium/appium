/*global beforeEach:true */
"use strict";

var env = require("../../helpers/env")
  , setup = require("../common/setup-base")
  , path = require('path');

var desired;
if (env.DEVICE === 'selendroid' || env.DEVICE === 'android') {
  var appPath = path.resolve(__dirname, '../../../sample-code/apps/' +
      'io.appium.gappium.sampleapp/platforms/android/ant-build/' +
      'HelloGappium-debug.apk'),
  desired = {
    app: appPath,
    'app-package': 'io.appium.gappium.sampleapp',
    'app-activity': '.HelloGappium',
  };
} else {
  var appPath = path.resolve(__dirname, '../../../sample-code/apps/' +
      'io.appium.gappium.sampleapp/platforms/ios/build' +
      (env.EMU ? '/emulator' : '') + '/HelloGappium.app'),
  desired = {
    app: appPath
  };
}

var activateWebView = function (driver) {
  // unify (ios vs selendroid) web view selection
  return driver.windowHandles().then(function (handles) {
    for (var handle in handles) {
      var hdl = handles[handle];
      if (hdl.indexOf('WEBVIEW') > -1) {
        return hdl;
      }
    }
    return handles[0];
  }).then(function (handle) {
    return driver.window(handle).catch(function () {});
  });
};

describe("gappium @skip-android-all", function () {

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
