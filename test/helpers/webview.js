"use strict";

var env = require("./env")
  , _ = require('underscore')
  , uuidGenerator = require('node-uuid');

var spinTitle = function (expTitle, browser, _timeout) {
  var timeout = typeof _timeout === 'undefined' ? 90 : _timeout;
  timeout.should.be.above(0);
  return browser
    .title()
    .then(function (pageTitle) {
      if (pageTitle.indexOf(expTitle) < 0) {
        return browser
          .sleep(500)
          .then(function () { return spinTitle(expTitle, browser, timeout - 1); });
      }
    });
};

var loadWebView = function (app, browser, urlToLoad, titleToSpin) {
  var uuid = uuidGenerator.v1();
  if (typeof urlToLoad === "undefined") {
    if (app === "chrome" || app === "chromium") {
      urlToLoad = env.CHROME_GUINEA_TEST_END_POINT + '?' + uuid;
    } else {
      urlToLoad = env.GUINEA_TEST_END_POINT + '?' + uuid;
    }
  }
  if (typeof titleToSpin === "undefined") {
    titleToSpin = uuid;
  }
  if (_.contains(["safari", "iwebview", "chrome", "chromium"], app)) {
    return browser
      .get(urlToLoad)
      .then(function () { return spinTitle(titleToSpin, browser); });
  } else {
    return browser
      .contexts()
      .then(function (ctxs) {
        ctxs.length.should.be.above(0);
        return browser
          .context(ctxs[1])
          .url();
      })
      .then(function (url) {
        if (url !== urlToLoad) {
          return browser
            .get(urlToLoad)
            .then(function () { return spinTitle(titleToSpin, browser); });
        } else {
          return spinTitle(titleToSpin, browser);
        }
      });
  }
};

module.exports = {
  spinTitle: spinTitle,
  loadWebView: loadWebView
};
