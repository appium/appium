"use strict";
var env = require('./env')
  , wd = require("wd")
  , Q = require("q")
  , _ = require("underscore")
  , androidUninstall = require('./reset').androidUninstall;

module.exports.initSession = function (desired, opts) {
  desired = desired || {};
  opts = opts || {};

  var deferred = Q.defer();

  var browser;

  wd.addPromiseChainMethod('clickBack', function () {
    var backEl;
    return this.elementByNameOrNull('Back')
    .then(function (el) {
      if (el) {
        backEl = el;
        return el.isDisplayed();
      } else return false;
    })
    .then(function (isDisplayed) {
      if (isDisplayed) {
        return backEl.click();
      }
    });
  });

  return {
    setUp: function () {
      browser = wd.promiseChainRemote(env.APPIUM_HOST, env.APPIUM_PORT, env.APPIUM_USERNAME, env.APPIUM_PASSWORD);
      if (env.VERBOSE) {
        browser.on('status', function (info) {
          console.log(info);
        });
        browser.on('command', function (meth, path, data) {
          console.log(' > ' + meth, path, data || '');
        });
      }
      deferred.resolve(browser);
      var caps = _.defaults(desired, env.CAPS);
      if (env.SAUCE) {
        caps.name = this.currentTest.parent.title + " " + this.currentTest.title;
      }

      if (env.VERBOSE) console.log("caps -->", caps);
      if (env.VERBOSE) console.log("opts -->", opts);
      
      function init(remainingAttemps) {
        if (env.VERBOSE) console.log("remainingAttemps -->", remainingAttemps);
        return browser
          .init(caps)
          .catch(function (err) {
            remainingAttemps --;
            if (remainingAttemps === 0) {
              throw err;
            } else {
              return browser.sleep(5000).then(function () {
                return init(remainingAttemps);
              });
            }
          });
      }
      var attempts = opts['no-retry'] ? 1 : 3;
      return browser.chain()
        .then(function () {
          // if android uninstall package first
          if (desired.device === 'Android' && desired['app-package']) {
            return androidUninstall(desired['app-package']);
          }
        }).then(function () { return init(attempts); })
        .setImplicitWaitTimeout(5000);
    },
    tearDown: function () {
      var passed = false;
      if (this.currentTest) {
        passed = this.currentTest.state = 'passed';
      }
      return browser.chain()
        .then(function () {
          if (!opts['no-quit']) {
            return browser
              .quit()
              .catch(function () {
                if (env.VERBOSE) console.warn("didn't quit cleanly.");
              });
          }
        }).then(function () {
          if (env.SAUCE) return browser.sauceJobStatus(passed);
        })
        .catch(function () { console.warn("didn't manange to set sauce status."); })
        .sleep(2000);
    },
    promisedBrowser: deferred.promise
  };
};

