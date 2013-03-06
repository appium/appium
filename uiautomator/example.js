"use strict";

var makeAdb = require('./adb')
  , adbOpts = {
      sdkRoot: process.env.ANDROID_HOME
      , avd: "jlipps1"
      , appPackage: "com.example.android.apis"
      , appActivity: "ApiDemos"
      , apkPath: "/Users/jlipps/Code/eclipse/ApiDemos/bin/ApiDemos-debug.apk"
    };

var adb = makeAdb(adbOpts);
var shutdown = function() {
  adb.sendShutdownCommand(function(data) {
    console.log(data);
  });
};
var onReady = function(err) {
  if (err) {
    console.log("Got error when starting: " + err);
    process.exit(1);
  } else {
    adb.sendAutomatorCommand("getDeviceSize", function(res) {
      console.log(res);
      adb.sendAutomatorCommand("click", {x: 100, y: 200}, function(res) {
        console.log(res);
        setTimeout(shutdown, 2000);
      });
    });
  }
};
var onExit = function() {
  console.log("Process exited");
  adb.goToHome(function() {});
};
adb.start(onReady, onExit);
