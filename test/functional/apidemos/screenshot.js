/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('screenshot', function(h) {
  it('should get an app screenshot', function(done) {
    h.driver.takeScreenshot(function(err, screenshot) {
      should.not.exist(err);
      should.exist(screenshot);
      done();
    });
  });
});
