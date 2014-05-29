"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - contexts @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('getting contexts should do nothing when no webview open', function (done) {
    driver
      .contexts().should.eventually.have.length(1)
      .nodeify(done);
  });
});
