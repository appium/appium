"use strict";

var _ = require('underscore')
  , logger = require('../../server/logger.js').get('appium')
  , jwpSuccess = require('../common.js').jwpSuccess
  , status = require('../../server/status.js')
  , NotYetImplementedError = require('../../server/errors.js').NotYetImplementedError
  , warnDeprecated = require('../../helpers.js').logDeprecationWarning;

var androidContextController = {};

androidContextController.NATIVE_WIN = "NATIVE_APP";
androidContextController.WEBVIEW_WIN = "WEBVIEW";
androidContextController.WEBVIEW_BASE = androidContextController.WEBVIEW_WIN + "_";
androidContextController.CHROMIUM_WIN = "CHROMIUM";

androidContextController.defaultContext = function () {
  return this.NATIVE_WIN;
};

androidContextController.leaveWebView = function (cb) {
  warnDeprecated('function', 'leaveWebView', 'context(null)');
  this.setWindow(this.defaultContext(), cb);
};

androidContextController.getCurrentContext = function (cb) {
  var response = {
    status: status.codes.Success.code
  , value: this.curContext || null
  };
  cb(null, response);
};

androidContextController.getContexts = function (cb) {
  this.listWebviews(function (err, webviews) {
    if (err) return cb(err);
    this.contexts = [this.NATIVE_WIN];

    var getProcessNameFromWebview = function (view, cb) {
      this.getProcessNameFromWebview(view, function (err, pkg) {
        if (err) return cb(err);
        this.contexts.push(WEBVIEW_BASE + pkg);
        return cb();
      }.bind(this));
    }.bind(this);

    async.each(webviews, getProcessNameFromWebview, function (err) {
      if (err) return cb(err);
      logger.debug("Available contexts: " + this.contexts);
      cb(null, {
        status: status.codes.Success.code, value: this.contexts
      });
    }.bind(this));
  }.bind(this));
};

androidContextController.isChromedriverContext = function (viewName) {
  return viewName.indexOf(this.WEBVIEW_WIN) !== -1 || viewName === this.CHROMIUM_WIN;
};

androidContextController.setContext = function (name, cb) {
  if (name === null) {
    name = this.defaultContext();
  } else if (name === this.WEBVIEW_WIN) {
    // handle setContext "WEBVIEW"
    name = WEBVIEW_BASE + this.appProcess;
  }
  this.getContexts(function () {
    if (!_.contains(this.contexts, name)) {
      return cb(null, {
        status: status.codes.NoSuchContext.code
      , value: "Context '" + name + "' does not exist"
      });
    }
    if (name === this.curContext) {
      return jwpSuccess(cb);
    }
    var next = function (err) {
      if (err) return cb(err);
      this.curContext = name;
      jwpSuccess(cb);
    }.bind(this);

    // current ChromeDriver doesn't handle more than a single web view
    if (this.isChromedriverContext(name)) {
      this.startChromedriverProxy(next);
    } else if (this.isChromedriverContext(this.curContext)) {
      this.stopChromedriverProxy(next);
    } else if (this.isProxy) { // e.g. WebView context handled in Selendroid
      this.proxyTo('wd/hub/session/' + this.proxySessionId + '/context', 'POST', {name: name}, next);
    }
  }.bind(this));
};

androidContextController.getWindowHandle = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidContextController.getWindowHandles = function (cb) {
  cb(new NotYetImplementedError(), null);
};

androidContextController.setWindow = function (name, cb) {
  cb(new NotYetImplementedError(), null);
};

module.exports = androidContextController;
