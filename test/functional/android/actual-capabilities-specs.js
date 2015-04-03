"use strict";

var setup = require("../common/setup-base")
  , desired = require("./apidemos/desired")
  , ADB = require('../../../lib/devices/android/adb')
  , Q = require("q");


describe("actual capabilities - session start", function () {
  var device;
  var version;
  before(function () {
    var adb = new ADB({}),
        adbShell = Q.denodeify(adb.shell.bind(adb));

    device = adb.udid;
    adbShell('getprop ro.build.version.release').then(function (res) {
      version = res[0];
    });
  });

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should answer with actual capabilities', function (done) {
    driver
      .sessionCapabilities()
        .should.eventually.contain({
          deviceName: device,
          platformVersion: version
        })
        .nodeify(done);
    });
});
