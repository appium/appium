"use strict";

var IOS = require("../../lib/devices/ios/ios")
  , Instruments = require('../../lib/devices/ios/instruments');

exports.getSimUdid = function (xcodeVer, sdkVer, desired, cb) {
  var opts = {
    forceIphone: false,
    forceIpad: false,
    xcodeVersion: xcodeVer,
    deviceName: desired.deviceName,
    platformVersion: desired.platformVersion,
    iOSSDKVersion: sdkVer
  };
  Instruments.getAvailableDevices(function (err, availDevices) {
    if (err) return cb(err);
    var dString = IOS.getDeviceStringFromOpts(opts);
    var sim = IOS.getSimForDeviceString(dString, availDevices);
    if (sim[1] === null) {
      return cb(new Error("Could not get UDID"));
    }
    cb(null, sim[1]);
  });
};
