/*global beforeEach:true */
"use strict";

var path = require('path')
  , describeWd = null
  , appPkg = "io.appium.gappium.sampleapp"
  , appAct = ".HelloGappium"
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/" + appPkg + "/platforms/ios/build/HelloGappium.app")
  , driverBlock = require("../../helpers/driverblock.js")
  , it = driverBlock.it;

// export env APPIUM_CORDOVA="android" to run tests against android version
if (typeof process.env.APPIUM_CORDOVA !== "undefined" && process.env.APPIUM_CORDOVA === "android") {
  appPath = path.resolve(__dirname, "../../../sample-code/apps/" + appPkg + "/platforms/android/bin/HelloGappium-debug.apk");
  describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct);
} else {
  describeWd = driverBlock.describeForApp(appPath, "ios", appPkg, appAct);
}

var activateWebView = function(h) {
  // unify (ios vs selendroid) web view selection
  return  h.driver.windowHandles().then(function(handles) {
    for (var handle in handles) {
      var hdl = handles[handle];
      if (hdl.indexOf('WEBVIEW') > -1) {
        return hdl;
      }
    }
    return handles[0];
  }).then(function(handle) {
    return h.driver.window(handle).catch(function() {});
  });
};

describeWd('HelloGappium', function(h) {

  beforeEach(function(done) {
    activateWebView(h).nodeify(done);
  });

  it('should open the app and navigate through the dialogs', function(done) {
    h.driver
      .sleep(3000) // timeout to visualize test execution
      .elementByCssSelector('.search-key')
        .sendKeys('j')
      .elementsByCssSelector('.topcoat-list a')
      .then(function(employees) {
        employees.length.should.equal(5);
        return employees[3].click();
      }).elementsByCssSelector('.actions a')
      .then(function(options) {
        options.length.should.equal(6);
        options[3].click();
      }).sleep(2000)
      .nodeify(done); // timeout to visualize test execution

  });
});
