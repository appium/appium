"use strict";

var setup = require("../../common/setup-base")
  , chai = require('chai');

chai.should();

var desired = {
  bundleId: 'com.apple.Preferences'
};

describe('settings app @skip-ios6 @skip-ios7', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should launch via bundle id', function (done) {
    driver
      .source()
      .should.eventually.contain("Settings")
      .nodeify(done);
  });
});
