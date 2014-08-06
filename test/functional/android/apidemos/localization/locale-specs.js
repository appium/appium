"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , ADB = require('../../../../../lib/devices/android/adb')
  , Q = require('q')
  , _ = require('underscore');

// cannot use adb on sauce
describe("apidemos - localization- locale @skip-ci @skip-real-device", function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);
  var driver;
  var adb = new ADB({}),
      reboot = require("../../../../helpers/reset").androidReboot(adb),
      adbShell = Q.denodeify(adb.shell.bind(adb));

  after(function (done) {
    // resetting to defaults
    adbShell('setprop persist.sys.country US')
      .then(function () { return reboot(); })
      .nodeify(done);
  });

  describe('default', function () {
    setup(this, desired).then(function (d) { driver = d; });

    it('should start', function (done) {
      adbShell('getprop persist.sys.country')
        .nodeify(done);
    });
  });

  describe('changing to FR', function () {
    setup(this, _.defaults({locale: 'FR'} ,desired)).then(function (d) { driver = d; });

    it('should be FR', function (done) {
      adbShell('getprop persist.sys.country')
        .then(function (res) {
          res[0].trim().should.equal('FR');
        }).nodeify(done);
    });
  });

});
