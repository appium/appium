"use strict";

var setup = require("../setup-base"),
    webviewHelper = require("../../../helpers/webview"),
    assert = require('assert'),
    loadWebView = webviewHelper.loadWebView,
    isChrome = webviewHelper.isChrome,
    testEndpoint = webviewHelper.testEndpoint,
    _ = require('underscore');

module.exports = function (desired) {

  describe('cookies', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    describe('within iframe webview', function () {
      it('should be able to get cookies for a page with none', function (done) {
        loadWebView(desired, driver, testEndpoint(desired) + 'iframes.html',
            "Iframe guinea pig").then(function () {
          return driver.allCookies().should.eventually.have.length(0);
        }).nodeify(done);
      });
    });
    describe('within webview', function () {
      // TODO: investigate why we need that
      function _ignoreEncodingBug(value) {
        if (isChrome(desired)) {
          console.warn('Going round android bug: whitespace in cookies.');
          return encodeURI(value);
        } else return value;
      }
      beforeEach(function (done) {
        loadWebView(desired, driver).nodeify(done);
      });
      it('should be able to get cookies for a page', function (done) {
        driver
          .allCookies()
          .then(function (cookies) {
            cookies.length.should.equal(2);
            cookies[0].name.should.equal("guineacookie1");
            cookies[0].value.should.equal(_ignoreEncodingBug("i am a cookie value"));
            cookies[1].name.should.equal("guineacookie2");
            cookies[1].value.should.equal(_ignoreEncodingBug("cookié2"));
          }).nodeify(done);
      });
      it('should be able to set a cookie for a page', function (done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function (cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          }).then(function () {
            return driver
              .setCookie(newCookie)
              .allCookies();
          })
          .then(function (cookies) {
            _.pluck(cookies, 'name').should.include(newCookie.name);
            _.pluck(cookies, 'value').should.include(newCookie.value);
            // should not clobber old cookies
            _.pluck(cookies, 'name').should.include("guineacookie1");
            _.pluck(cookies, 'value').should.include(_ignoreEncodingBug("i am a cookie value"));
          })
          .nodeify(done);
      });
      it('should be able to set a cookie with expiry', function (done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        var now = parseInt(Date.now() / 1000, 10);
        newCookie.expiry = now - 1000; // set cookie in past
        driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function (cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          })
          .then(function () {
            return driver
              .setCookie(newCookie)
              .allCookies();
          }).then(function (cookies) {
            // should not include cookie we just added because of expiry
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
            // should not clobber old cookies
            _.pluck(cookies, 'name').should.include("guineacookie1");
            _.pluck(cookies, 'value').should.include(_ignoreEncodingBug("i am a cookie value"));
          }).nodeify(done);
      });
      it('should be able to delete one cookie', function (done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        driver
          .deleteCookie(newCookie.name)
          .allCookies()
        .then(function (cookies) {
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
        }).then(function () {
          return driver
            .setCookie(newCookie)
            .allCookies();
        }).then(function (cookies) {
          _.pluck(cookies, 'name').should.include(newCookie.name);
          _.pluck(cookies, 'value').should.include(newCookie.value);
        }).then(function () {
          return driver
            .deleteCookie('newcookie')
            .allCookies();
        }).then(function (cookies) {
          _.pluck(cookies, 'name').should.not.include(newCookie.name);
          _.pluck(cookies, 'value').should.not.include(newCookie.value);
        }).nodeify(done);
      });
      it('should be able to delete all cookie', function (done) {
        var newCookie = {name: "newcookie", value: "i'm new here"};
        driver
          .deleteCookie(newCookie.name)
          .allCookies()
          .then(function (cookies) {
            _.pluck(cookies, 'name').should.not.include(newCookie.name);
            _.pluck(cookies, 'value').should.not.include(newCookie.value);
          }).then(function () {
            return driver
              .setCookie(newCookie)
              .allCookies();
          }).then(function (cookies) {
            _.pluck(cookies, 'name').should.include(newCookie.name);
            _.pluck(cookies, 'value').should.include(newCookie.value);
          }).then(function () {
            return driver
              .deleteAllCookies()
              .allCookies();
          }).then(function (cookies) {
            assert(cookies.length === 0);
          }).nodeify(done);
      });


    });
  });
};
