"use strict";

var desc = require("../../helpers/driverblock.js").describeForSafari()
  , it = require("../../helpers/driverblock.js").it
  , _ = require("underscore")
  , fs = require('fs');

_.each(["iPhone", "iPad"], function(device) {
  desc('screenshots (' + device + ')', function(h) {
    it('should get a local screenshot', function(done) {
      var localScreenshotFile = '/tmp/test_screenshot_appium.png';
      if (fs.existsSync(localScreenshotFile)) {
        fs.unlinkSync(localScreenshotFile);
      }
      h.driver
        .execute("mobile: localScreenshot", [{file: localScreenshotFile}])
        .then(function() {
          var screenshot = fs.readFileSync(localScreenshotFile);
          screenshot.should.exist;
          screenshot.length.should.be.above(1000);
        }).nodeify(done);
    });
    it('should get an app screenshot', function(done) {
      h.driver
        .takeScreenshot()
          .should.eventually.exist
        .nodeify(done);
    });
    it('should get an app screenshot in landscape mode', function(done) {
      h.driver.takeScreenshot().then(function(screenshot1) {
        screenshot1.should.exist;
        return h.driver
          .setOrientation("LANDSCAPE")
          // A useless error does often exist here, let's ignore it
          .catch(function() {})
          .takeScreenshot().then(function(screenshot2) {
            screenshot2.should.exist;
            screenshot2.should.not.eql(screenshot1);
          });
      }).nodeify(done);
    });
  }, null, null, {device: device + ' Simulator'});
});
