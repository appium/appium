"use strict";
var rd = require('./remote-debugger.js')
  , _ = require("underscore");

var remote = rd.init(function() {
  console.log("Debugger said app disconnected");
  process.exit(0);
});

remote.connect(function(appDict) {
  console.log("App dict:");
  console.log(appDict);
  var appBundleId = null;
  _.each(appDict, function(appName, appId) {
    appBundleId = appId;
  });
  if (appBundleId) {
    remote.selectApp(appBundleId, function(pageArray) {
      console.log(pageArray);
      var pageIdKey = null;
      _.each(pageArray, function(page) {
        pageIdKey = page.id;
      });
      if (pageIdKey) {
        remote.selectPage(pageIdKey, function() {
          remote.execute("alert('hi');", function(res) {
            console.log(res);
            process.exit(0);
          });
        });
      } else {
        console.log("No page is available");
        process.exit(1);
      }
    });
  } else {
    console.log("No apps are available");
    process.exit(1);
  }
});
