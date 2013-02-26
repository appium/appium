"use strict";

var makeAdb = require('./adb');
var adbOpts = {
  sdkRoot: process.env.ANDROID_HOME
  , avd: "jlipps1"
};

makeAdb(adbOpts, function(err, adb) {
  adb.getConnectedDevices(function(err, devices) {
    if (devices.length) {
      adb.waitForDevice(function(err) {
        adb.pushAppium(function(err) {
          adb.forwardPort(function(err) {
            var onReady = function() {
              console.log("Ready for new commands");
            };
            var onExit = function() {
              console.log("Process exited");
            };
            adb.runBootstrap(onReady, onExit);
          });
        });
      });
    } else {
      console.log("Can't proceed without a connected device!");
      process.exit(1);
    }
  });
});
