"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired")
  , fs = require('fs');

describe('screenshot', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  //todo: not working in nexus 7
  it('should get a local screenshot', function(done) {
    var localScreenshotFile = '/tmp/test_screenshot_appium.png';
    if (fs.existsSync(localScreenshotFile)) {
      fs.unlinkSync(localScreenshotFile);
    }
    browser.execute("mobile: localScreenshot", [{file: localScreenshotFile}])
      .then(function() {
        var screenshot = fs.readFileSync(localScreenshotFile);
        screenshot.should.exist;
        screenshot.length.should.be.above(1000);
      }).nodeify(done);
  });
  it('should get an app screenshot', function(done) {
    browser.takeScreenshot()
      .should.eventually.have.length.above(1000)
      .nodeify(done);
  });
  it('should not cause other commands to fail', function(done) {
    browser
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .takeScreenshot()
        .should.eventually.have.length.above(1000)
      .execute("mobile: find", [[[[3, "Animation"]]]])
        .should.eventually.exist
      .sleep(5000) // cooldown      
      .nodeify(done);
  });
});
