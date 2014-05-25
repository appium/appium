"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - background app @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });
  it("should background the app for 4 of seconds (+/- 6 secs)", function (done) {
    var before = new Date().getTime() / 1000;
    driver
      .backgroundApp(4)
      .then(function () {
        ((new Date().getTime() / 1000) - before).should.be.below(11);
      }).nodeify(done);
  });
});
