"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - lock device @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });
  var allowance = (env.IOS7 || env.IOS8) ? 9 : 2;
  it("should lock the device for 4 seconds (+/- " + allowance + "  secs)", function (done) {
    var before = new Date().getTime() / 1000;
    driver
      .lockDevice(4)
      .then(function () {
        var now = (new Date().getTime() / 1000);
        (now - before).should.be.above(4);
        (now - before).should.be.below(4 + allowance + 1);
      }).nodeify(done);
  });
});
