"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired")
  , fs = require('fs');

describe("apidemos - screenshot -", function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  //todo: fix that got: Command failed: remote object '/data/local/tmp/screenshot.png' does not exist  
  it('should get a local screenshot @skip-all-android', function(done) {
    var localScreenshotFile = '/tmp/test_screenshot_appium.png';
    if (fs.existsSync(localScreenshotFile)) {
      fs.unlinkSync(localScreenshotFile);
    }
    driver.execute("mobile: localScreenshot", [{file: localScreenshotFile}])
      .then(function() {
        var screenshot = fs.readFileSync(localScreenshotFile);
        screenshot.should.exist;
        screenshot.length.should.be.above(1000);
      }).nodeify(done);
  });
  it('should get an app screenshot', function(done) {
    driver.takeScreenshot()
      .should.eventually.have.length.above(1000)
      .nodeify(done);
  });
  it('should not cause other commands to fail', function(done) {
    driver
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .takeScreenshot()
        .should.eventually.have.length.above(1000)
      .execute("mobile: find", [[[[3, "Animation"]]]])
        .should.eventually.exist
      .sleep(5000) // cooldown      
      .nodeify(done);
  });
});
