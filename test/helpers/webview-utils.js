"use strict";

var env = require("./env"),
    uuidGenerator = require('node-uuid');

var spinTitle = function (expTitle, browser, _timeout) {
  var timeout = typeof _timeout === 'undefined' ? 90 : _timeout;
  timeout.should.be.above(0);
  return browser
    .title()
    .then(function(pageTitle) {
      if (pageTitle.indexOf(expTitle) < 0) {
        return browser
          .sleep(500)
          .then(function() { return spinTitle(expTitle, browser, timeout - 1); });
      }
    });
};

var loadWebView = function(app, browser, urlToLoad, titleToSpin) {
  var uuid = uuidGenerator.v1();
  if (typeof urlToLoad === "undefined") {
    if (app === "chrome") {
      urlToLoad = env.CHROME_GUINEA_TEST_END_POINT + '?' + uuid;
    } else {
      urlToLoad = env.GUINEA_TEST_END_POINT + '?' + uuid;
    }
  }
  if (typeof titleToSpin === "undefined") {
    titleToSpin = uuid;
  }
  if (app === "safari" || app === "iwebview") {
    return browser
      .get(urlToLoad)
      .then(function() { return spinTitle(titleToSpin, browser); });
  } else {
    return browser
      .windowHandles()
      .then(function(handles) {
        handles.length.should.be.above(0);
        return browser
          .window(handles[0])
          .url();
      })
      .then(function(url) {
        if (url !== urlToLoad) {
          return browser
            .get(urlToLoad)
            .then(function() { return spinTitle(titleToSpin, browser); });
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
