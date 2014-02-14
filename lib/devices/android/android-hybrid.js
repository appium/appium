"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , rd = require('../remote-debugger.js');

var getWebviews = function (cb) {
  var webviews = [];
  this.adb.shell("cat /proc/net/unix", function (err, out) {
    _.each(out.split("\n"), function (line) {
      if (line.indexOf("@webview_devtools_remote_") !== -1) {
        webviews.push(/@(webview_devtools_remote_.+)$/.exec(line)[1]);
      }
    });
  });
  return webviews;
};

var setupPorts = function (localPort, abstractDevicePort, cb) {
  this.adb.forwardAbstractPort(localPort, abstractDevicePort, cb);
};
