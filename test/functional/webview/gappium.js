/*global it:true beforeEach:true */
"use strict";

var path = require('path')
  , describeWd = null
  , appPkg = "io.appium.gappium.sampleapp"
  , appAct = "HelloGappium"
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/" + appPkg + "/platforms/ios/build/" + appAct + ".app")
  , driverBlock = require("../../helpers/driverblock.js")
  , should = require('should');

// export env APPIUM_CORDOVA="android" to run tests against android version
if (typeof process.env.APPIUM_CORDOVA !== "typeof" && process.env.APPIUM_CORDOVA === "android") {
  appPath = path.resolve(__dirname, "../../../sample-code/apps/" + appPkg + "/platforms/android/bin/" + appAct + "-debug.apk");
  describeWd = driverBlock.describeForApp(appPath, "selendroid", appPkg, appAct);
} else {
  describeWd = driverBlock.describeForApp(appPath, "ios", appPkg, appAct);
}

var activateWebView = function(h) {
  // unify (ios vs selendroid) web view selection
  var errhndlr = function(done) {
    return function(err) {
      done();
    };
  };

  return function(done) {
    h.driver.windowHandles(function(err, handles) {
      for (var handle in handles) {
        var hdl = handles[handle];
        if (hdl.indexOf('WEBVIEW') > -1) {
          h.driver.window(hdl, errhndlr(done));

          return;
        }
      }

      h.driver.window(handles[0], function(err) {
        done();
      });
    });
  };
};

describeWd('HelloGappium', function(h) {
  beforeEach(activateWebView(h));
  it('should open the app and navigate through the dialogs', function(done) {
    h.driver.elementByCssSelector('.search-key', function(err, el) {
      should.not.exist(err);
      should.exist(el);
      setTimeout(function() {
        el.sendKeys('j', function(err) {
          h.driver.elementsByCssSelector('.topcoat-list a', function(err, employees) {
            employees.length.should.equal(5);
            employees[3].click(function(err) {
              h.driver.elementsByCssSelector('.actions a', function(err, options) {
                options.length.should.equal(6);
                options[3].click(function(err) {
                  setTimeout(done, 2000); // timeout to visiualize test execution
                });
              });
            });
          });
        });
      }, 3000); // timeout to visiualize test execution
    });
  });
});
