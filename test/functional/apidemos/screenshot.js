"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it
  , fs = require('fs');

describeWd('screenshot', function(h) {
  //todo: not working in nexus 7
  it('should get a local screenshot', function(done) {
    var localScreenshotFile = '/tmp/test_screenshot_appium.png';
    if (fs.existsSync(localScreenshotFile)) {
      fs.unlinkSync(localScreenshotFile);
    }
    h.driver.execute("mobile: localScreenshot", [{file: localScreenshotFile}])
      .then(function() {
        var screenshot = fs.readFileSync(localScreenshotFile);
        screenshot.should.exist;
        screenshot.length.should.be.above(1000);
      }).nodeify(done);
  });
  it('should get an app screenshot', function(done) {
    h.driver.takeScreenshot()
      .should.eventually.have.length.above(1000)
      .nodeify(done);
  });
  it('should not cause other commands to fail', function(done) {
    h.driver
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .takeScreenshot()
        .should.eventually.have.length.above(1000)
      .execute("mobile: find", [[[[3, "Animation"]]]])
        .should.eventually.exist
      .sleep(5000) // cooldown      
      .nodeify(done);
  });
});
