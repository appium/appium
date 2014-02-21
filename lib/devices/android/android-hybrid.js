"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , rd = require('../remote-debugger.js');

var androidHybrid = {};

androidHybrid.listWebviews = function (cb) {
  var webviews = [];
  this.adb.shell("cat /proc/net/unix", function (err, out) {
    if (err) return cb(err);
    _.each(out.split("\n"), function (line) {
      if (line.indexOf("@webview_devtools_remote_") !== -1) {
        webviews.push(/@(webview_devtools_remote_.+)$/.exec(line)[1]);
      }
    });
    cb(null, webviews);
  });
};

var getWebviews = function (cb) {
};

var setupPorts = function (localPort, abstractDevicePort, cb) {
  this.adb.forwardAbstractPort(localPort, abstractDevicePort, cb);
};
