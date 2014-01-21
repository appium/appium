"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , fs = require('fs');

describe('screenshots (' + env.DEVICE + ')', function() {
  var browser;
  setup(this, {app:'safari'})
    .then( function(_browser) { browser = _browser; } );

  it('should get a local screenshot', function(done) {
    var localScreenshotFile = '/tmp/test_screenshot_appium.png';
    if (fs.existsSync(localScreenshotFile)) {
      fs.unlinkSync(localScreenshotFile);
    }
    browser
      .execute("mobile: localScreenshot", [{file: localScreenshotFile}])
      .then(function() {
        var screenshot = fs.readFileSync(localScreenshotFile);
        screenshot.should.exist;
        screenshot.length.should.be.above(1000);
      }).nodeify(done);
  });
  it('should get an app screenshot', function(done) {
    browser
      .takeScreenshot()
        .should.eventually.exist
      .nodeify(done);
  });
  it('should get an app screenshot in landscape mode', function(done) {
    browser.takeScreenshot().then(function(screenshot1) {
      screenshot1.should.exist;
      return browser
        .setOrientation("LANDSCAPE")
        // A useless error does often exist here, let's ignore it
        .catch(function() {})
        .takeScreenshot().then(function(screenshot2) {
          screenshot2.should.exist;
          screenshot2.should.not.eql(screenshot1);
        });
    }).nodeify(done);
  });
});
