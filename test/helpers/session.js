"use strict";
var env = require('./env')
  , wd = require("wd")
  , Q = require("q")
  , _ = require("underscore")
  , iosReset = require('./reset').iosReset
  , androidUninstall = require('./reset').androidUninstall;

require('colors');

var trimToLength = function (str, length) {
  return (str && str.length > length) ?
    str.substring(0, length) + '...' : str;
};

module.exports.initSession = function (desired, opts) {
  desired = desired || {};
  opts = opts || {};

  var deferred = Q.defer(),
      browser,
      initialized;

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
        var MAX_DATA_LENGTH = 500;
        browser.on('status', function (info) {
          console.log(info.cyan);
        });
        browser.on('command', function (eventType, command, response) {
          console.log(' > ' + eventType.cyan, command, (trimToLength(response, MAX_DATA_LENGTH) || '').grey);
        });
        browser.on('http', function (meth, path, data) {
          console.log(' > ' + meth.magenta, path, (trimToLength(data, MAX_DATA_LENGTH) || '').grey);
        });
      }
      deferred.resolve(browser);
      var caps = _.defaults(desired, env.CAPS);
      if (env.SAUCE) {
        caps.name = this.currentTest.parent.title + " " + this.currentTest.title;
      }

      if (env.VERBOSE) console.log("caps -->", caps);
      if (env.VERBOSE) console.log("opts -->", opts);

      function init(remainingAttempts) {
        if (env.VERBOSE) console.log("remainingAttempts -->", remainingAttempts);
        
        return browser
          .init(caps)
          .catch(function (err) {
            remainingAttempts --;
            if (remainingAttempts === 0) {
              throw err;
            } else {
              return browser.sleep(10000).then(function () {
                return init(remainingAttempts);
              });
            }
          });
      }
      var attempts = opts['no-retry'] ? 1 : 3;
      return browser.chain()
        .then(function () {
          if (env.IOS && env.RESET_IOS) { return iosReset(); }
        }).then(function () {
          // if android uninstall package first
          if (desired.device === 'Android' && desired['app-package']) {
            return androidUninstall(desired['app-package']);
          }
        }).then(function () { return init(attempts); })
        .then(function () { initialized = true; })
        .setImplicitWaitTimeout(5000);
    },
    tearDown: function () {
      var passed = false;
      if (this.currentTest) {
        passed = this.currentTest.state = 'passed';
      }
      return browser.chain()
        .then(function () {
          if (initialized && !opts['no-quit']) {
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
