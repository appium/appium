"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , ADB = require('../../../../../lib/devices/android/adb')
  , Q = require('q')
  , exec = Q.denodeify(require('child_process').exec)
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

  // TODO: enable this once new CI is setup and add testcases
  // see #3923
  describe.skip('with avd', function () {
    var avd = process.env.APPIUM_TEST_AVD;

    before(function (done) {
      exec('pkill -9 -f emulator')
        .catch(function () {})
        .delay(500)
      .then(function () {
        return exec('adb kill-server')
          .catch(function () {});
      })
      .delay(500)
      .nodeify(done);
    });

    describe('Launching with FR', function () {
      setup(this, _.defaults({avd: avd, locale: 'FR'} ,desired))
        .then(function (d) { driver = d; });

      it('should be FR', function (done) {
        adbShell('getprop persist.sys.country')
          .then(function (res) {
            res[0].trim().should.equal('FR');
          })
          .nodeify(done);
      });
    });

    describe('Launching with US', function () {
      setup(this, _.defaults({avd: avd, locale: 'US'} ,desired))
        .then(function (d) { driver = d; });

      it('should be US', function (done) {
        adbShell('getprop persist.sys.country')
          .then(function (res) {
            res[0].trim().should.equal('US');
          }).nodeify(done);
      });
    });

  });
});
