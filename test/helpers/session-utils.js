"use strict";
var env = require('./env')
  , wd = require('wd')
  , Q = wd.Q
  , _ = require("underscore");

module.exports.initSession = function(desired) {
  desired = desired || {};
  var deferred = Q.defer();

  var browser;

  return {
    setUp: function() {
      browser = wd.promiseChainRemote(env.APPIUM_HOST, env.APPIUM_PORT, env.APPIUM_USERNAME, env.APPIUM_PASSWORD);
      if (env.VERBOSE) {
        browser.on('status', function(info) {
          console.log(info);
        });
        browser.on('command', function(meth, path, data) {
          console.log(' > ' + meth, path, data || '');
        });
      }
      deferred.resolve(browser);
      var caps = _.defaults(desired, env.CAPS);
      if (env.SAUCE) {
        caps.name = this.currentTest.parent.title + " " + this.currentTest.title;
      }
      
      if (env.VERBOSE) console.log("caps -->", caps);

      return browser
        .init(caps)
        .setImplicitWaitTimeout(5000);
    },
    tearDown: function() {
      var passed = false;
      if (this.currentTest) {
        passed = this.currentTest.state = 'passed';
      }
      return browser
        .quit()
        .catch(function() {
          console.warn("didn't quit cleanly.");
        })
        .then( function() {
          if (env.SAUCE) return browser.sauceJobStatus(passed);
        })
        .catch(function() { console.warn("didn't manange to set sauce status."); })
        .sleep(2000);
    },
    promisedBrowser: deferred.promise
  };
};

