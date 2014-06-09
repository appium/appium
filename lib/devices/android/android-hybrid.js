"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , errors = require('../../server/errors.js')
  , UnknownError = errors.UnknownError
  , Chromedriver = require('./chromedriver.js');

var androidHybrid = {};

androidHybrid.chromedriver = null;

androidHybrid.listWebviews = function (cb) {
  logger.debug("Getting a list of available webviews");
  var webviews = [];
  var definedDeviceSocket = this.args.androidDeviceSocket;
  var androidWebViewsCount = 0; // for android.webkit.WebView
  this.adb.shell("cat /proc/net/unix", function (err, out) {
    if (err) return cb(err);
    _.each(out.split("\n"), function (line) {
      line = line.trim();
      if (definedDeviceSocket) {
        // check if line ends with "@"+definedDeviceSocket
        if (line.indexOf("@" + definedDeviceSocket) ===
            line.length - definedDeviceSocket.length - 1) {
          if (line.indexOf("webview_devtools_remote") !== -1) {
            webviews.push(this.WEBVIEW_BASE + androidWebViewsCount.toString());
            androidWebViewsCount++;
          } else {
            webviews.push(this.CHROMIUM_WIN);
          }
        }
      } else if (line.indexOf("@webview_devtools_remote") !== -1) {
        // for multiple webviews a list of 'WEBVIEW_<index>' will be returned
        // where <index> is zero based (same is in selendroid)
        webviews.push(this.WEBVIEW_BASE + androidWebViewsCount.toString());
        androidWebViewsCount++;
      }
    }.bind(this));
    webviews = _.uniq(webviews);
    logger.debug(JSON.stringify(webviews));
    cb(null, webviews);
  }.bind(this));
};

var previousState = {};

androidHybrid.rememberProxyState = function () {
  previousState.proxyHost = this.proxyHost;
  previousState.proxyPort = this.proxyPort;
  previousState.proxySessionId = this.proxySessionId;
  previousState.isProxy = this.isProxy;
};

androidHybrid.restoreProxyState = function () {
  this.proxyHost = previousState.proxyHost;
  this.proxyPort = previousState.proxyPort;
  this.proxySessionId = previousState.proxySessionId;
  this.isProxy = previousState.isProxy;
};

androidHybrid.getProcessNameFromWebview = function (webview, cb) {
  // webview_devtools_remote_4296 => 4296
  var pid = webview.match(/\d+$/);
  if (!pid) return cb("No pid for webview " + webview);
  pid = pid[0];
  logger.info(webview + " mapped to pid " + pid);

  logger.info("Getting process name for webview");
  this.adb.shell("ps", function (err, out) {
    if (err) return cb(err);
    var pkg = "unknown";
    _.find(out.split(/\r?\n/), function (line) {
      line = line.trim().split(/\s+/);
      var pidColumn = line[1];
      if (pidColumn && pidColumn.indexOf(pid) !== -1) {
        var pkgColumn = line[line.length - 1];
        pkg = pkgColumn;
        return pkg;
      }
    });
    logger.info("returning process name: " + pkg);
    return cb(null, pkg);
  });
};

androidHybrid.startChromedriverProxy = function (cb) {
  logger.debug("Connecting to chrome-backed webview");
  if (this.chromedriver !== null) {
    return cb(new Error("We already have a chromedriver instance running"));
  }
  var chromeArgs = {
    port: this.args.chromeDriverPort
  , executable: this.args.chromedriverExecutable
  , deviceId: this.adb.curDeviceId
  , enablePerformanceLogging: this.args.enablePerformanceLogging
  };
  this.chromedriver = new Chromedriver(chromeArgs,
      this.onChromedriverExit.bind(this));
  this.rememberProxyState();
  this.proxyHost = this.chromedriver.proxyHost;
  this.proxyPort = this.chromedriver.proxyPort;
  this.isProxy = true;
  var caps = {
    chromeOptions: {
      androidPackage: this.args.appPackage,
      androidUseRunningApp: true
    }
  };
  // For now the only known arg passed this way is androidDeviceSocked used by Operadriver (deriving from Chromedriver)
  // We don't know how other Chromium embedders will call this argument so for now it's name needs to be configurable
  // When Google adds the androidDeviceSocket argument to the original Chromedriver then we will be sure about it's name
  // for all Chromium embedders (as their Webdrivers will derive from Chromedriver)
  if (this.args.specialChromedriverSessionArgs) {
    _.each(this.args.specialChromedriverSessionArgs, function (val, option) {
      caps.chromeOptions[option] = val;
    });
  }
  this.chromedriver.createSession(caps, function (err, sessId) {
    if (err) return cb(err);
    logger.debug("Setting proxy session id to " + sessId);
    this.proxySessionId = sessId;
    cb();
  }.bind(this));
};

androidHybrid.onChromedriverExit = function () {
  logger.debug("Chromedriver exited unexpectedly");
  if (typeof this.cbForCurrentCmd === "function") {
    var error = new UnknownError("Chromedriver quit unexpectedly during session");
    this.shutdown(function () {
      this.cbForCurrentCmd(error, null);
    }.bind(this));
  }
};

androidHybrid.cleanupChromedriver = function (cb) {
  if (this.chromedriver) {
    logger.debug("Cleaning up Chromedriver");
    this.chromedriver.stop(function (err) {
      if (err) logger.warn("Error stopping chromedriver: " + err.message);
      this.chromedriver = null;
      this.restoreProxyState();
      cb();
    }.bind(this));
  } else {
    cb();
  }
};

androidHybrid.stopChromedriverProxy = function (cb) {
  if (this.chromedriver !== null) {
    this.chromedriver.deleteSession(function (err) {
      if (err) return cb(err);
      this.cleanupChromedriver(cb);
    }.bind(this));
  } else {
    cb();
  }
};

module.exports = androidHybrid;
