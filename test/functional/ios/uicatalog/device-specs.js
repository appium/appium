"use strict";

var env = require('../../../helpers/env'),
    setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - device -', function () {

  describe('lock device', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });
    var allowance = env.IOS7 ? 5 : 2;
    it("should lock the device for 4 of seconds (+/- " + allowance + "  secs)", function (done) {
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
  describe('background app', function () {
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
});
