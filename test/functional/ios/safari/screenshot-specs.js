"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base");

describe("safari - screenshot", function () {
  // TODO: enable safari tests on ci
  describe('screenshots (' + env.DEVICE + ')', function () {
    var driver;
    setup(this, {browserName: 'safari'}).then(function (d) { driver = d; });

    it('should get an app screenshot', function (done) {
      driver
        .takeScreenshot()
          .should.eventually.exist
        .nodeify(done);
    });
    it('should get an app screenshot in landscape mode', function (done) {
      driver.takeScreenshot().then(function (screenshot1) {
        screenshot1.should.exist;
        return driver
          .setOrientation("LANDSCAPE")
          // A useless error does often exist here, let's ignore it
          .catch(function () {})
          .takeScreenshot().then(function (screenshot2) {
            screenshot2.should.exist;
            screenshot2.should.not.eql(screenshot1);
          });
      }).sleep(3000) // cooldown
      .nodeify(done);
    });
  });
});
