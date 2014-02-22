"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , Chromedriver = require('./chromedriver.js');

var androidHybrid = {};

androidHybrid.listWebviews = function (cb) {
  logger.info("Getting a list of available webviews");
  var webviews = [];
  this.adb.shell("cat /proc/net/unix", function (err, out) {
    if (err) return cb(err);
    _.each(out.split("\n"), function (line) {
      if (line.indexOf("@webview_devtools_remote_") !== -1) {
        webviews.push(/webview_devtools_remote_.+/.exec(line)[0]);
      }
    });
    logger.info(JSON.stringify(webviews));
    cb(null, webviews);
  });
};

androidHybrid.startChromedriverProxy = function (cb) {
  logger.info("Connecting to chrome-backed webview");
  if (this.chromedriver !== null) {
    return cb(new Error("We already have a chromedriver instance running"));
  }
  this.chromedriver = new Chromedriver(this.chromedriverPort,
      this.onChromedriverExit.bind(this));
  this.proxyHost = this.chromedriver.proxyHost;
  this.proxyPort = this.chromedriver.proxyPort;
  this.isProxy = true;
  var caps = {
    chromeOptions: {
      androidPackage: this.appPackage,
      androidUseRunningApp: true
    }
  };
  this.chromedriver.createSession(caps, cb);
};

androidHybrid.onChromedriverExit = function () {
  logger.info("Chromedriver exited unexpectedly");
  this.cleanup();
};

androidHybrid.stopChromedriverProxy = function (cb) {
  if (this.chromedriver !== null) {
    this.chromedriver.deleteSession(function (err) {
      if (err) return cb(err);
      this.chromedriver.stop(function (err) {
        if (err) return cb(err);
        this.chromedriver = null;
        this.proxyHost = null;
        this.proxyPort = null;
        this.isProxy = false;
      }.bind(this));
    }.bind(this));
  } else {
    cb();
  }
};

module.exports = androidHybrid;
