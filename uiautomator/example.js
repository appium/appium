"use strict";

var makeAdb = require('./adb')
  , adbOpts = {
      sdkRoot: process.env.ANDROID_HOME
      , avd: "jlipps1"
      , appPackage: "com.example.android.apis"
      , appActivity: "ApiDemos"
      , apkPath: "/Users/jlipps/Code/eclipse/ApiDemos/bin/ApiDemos-debug.apk"
    };

makeAdb(adbOpts, function(err, adb) {

  var shutdown = function() {
    adb.sendShutdownCommand(function(data) {
      console.log(data);
    });
  };
  var onReady = function() {
    adb.sendAutomatorCommand("getDeviceSize", function(res) {
      console.log(res);
      adb.sendAutomatorCommand("click", {x: 100, y: 200}, function(res) {
        console.log(res);
        setTimeout(shutdown, 2000);
      });
    });
  };
  var onExit = function() {
    console.log("Process exited");
    adb.goToHome(function() {});
  };
  var go = function() {
    adb.runBootstrap(onReady, onExit);
  };
  adb.getConnectedDevices(function(err, devices) {
    if (devices.length) {
      adb.waitForDevice(function() {
        adb.pushAppium(function() {
          adb.forwardPort(function() {
            adb.uninstallApp(function() {
              adb.installApp(function() {
                adb.startApp(function() {
                  setTimeout(go, 2000);
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
