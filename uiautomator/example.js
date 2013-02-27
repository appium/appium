"use strict";

var makeAdb = require('./adb');
var adbOpts = {
  sdkRoot: process.env.ANDROID_HOME
  , avd: "jlipps1"
  , appPackage: "com.example.android.apis"
  , appActivity: "ApiDemos"
  , apkPath: "/Users/jlipps/Code/eclipse/ApiDemos/bin/ApiDemos-debug.apk"
};


makeAdb(adbOpts, function(err, adb) {
  adb.getConnectedDevices(function(err, devices) {
    if (devices.length) {
      adb.waitForDevice(function() {
        adb.pushAppium(function() {
          adb.forwardPort(function() {
            adb.uninstallApp(function() {
              adb.installApp(function() {
                adb.startApp(function() {
                  var onReady = function() {
                    console.log("Ready for new commands");
                    adb.sendShutdownCommand(function(data) {
                      console.log("Got the data all the way from android");
                      console.log(data);
                    });
                  };
                  var onExit = function() {
                    console.log("Process exited");
                    adb.goToHome(function() {});
                  };
                  var go = function() {
                    adb.runBootstrap(onReady, onExit);
                  };
                  setTimeout(go, 3000);

                });
              });
            });
          });
        });
      });
    } else {
      console.log("Can't proceed without a connected device!");
      process.exit(1);
    }
  });
});
