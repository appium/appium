/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , fs = require('fs')
  , should = require('should');

describeWd('screenshot', function(h) {
  it('should get a local screenshot', function(done) {
    var localScreenshotFile = '/tmp/test_screenshot_appium.png';
    if (fs.existsSync(localScreenshotFile)) {
      fs.unlinkSync(localScreenshotFile);
    }
    h.driver.execute("mobile: localScreenshot", [{file: localScreenshotFile}], function(err) {
      should.not.exist(err);
      var screenshot = fs.readFileSync(localScreenshotFile);
      should.exist(screenshot);
      screenshot.length.should.be.above(1000);
      done();
    });
  });
  it('should get an app screenshot', function(done) {
    h.driver.takeScreenshot(function(err, screenshot) {
      should.not.exist(err);
      should.exist(screenshot);
      screenshot.length.should.be.above(1000);
      done();
    });
  });
  it('should not cause other commands to fail', function(done) {
    h.driver.execute("mobile: find", [[[[7, "Animation"]]]], function(err, el) {
      should.not.exist(err);
      h.driver.takeScreenshot(function(err, screenshot) {
        should.not.exist(err);
        should.exist(screenshot);
        screenshot.length.should.be.above(1000);
        h.driver.execute("mobile: find", [[[[7, "Animation"]]]], function(err, el) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
});
