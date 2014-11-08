"use strict";
var env = require('../../helpers/env')
  , initSession = require('../../helpers/session').initSession
  , getTitle = require('../../helpers/title').getTitle
  , wd = require('wd')
  , chai = require('chai')
  , chaiAsPromised = require('chai-as-promised')
  , CodeInjector = require('./code-injector')
  , Q = require('q');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;
require("colors");

module.exports = function (context) {
  var deferred = Q.defer();
  context.timeout(env.MOCHA_INIT_TIMEOUT);


  var desired;

  if (env.IOS) {
    desired = {
      app: process.env.APPIUM_LOCAL_IOS_DYNAMIC_APP ||
        'https://github.com/sebv/DynamicApp/raw/master/assets/ios/simulator/DynamicApp.app.zip'
    };
  } else if (env.ANDROID) {
    desired = {
      app: process.env.APPIUM_LOCAL_ANDROID_DYNAMIC_APP ||
        'https://github.com/sebv/DynamicApp/raw/master/assets/android/DynamicApp.apk'
    };
  }
  var session = initSession(desired, {});
  var allPassed = true;
  var codeInjector = new CodeInjector({port: 8085});

  session.promisedBrowser.then(function (driver) {
    deferred.resolve([driver, codeInjector]);
  });

  before(function () {
    return codeInjector.start();
  });

  before(function () {
    return session.setUp(getTitle(context));
  });

  after(function () { return session.tearDown(allPassed); });

  after(function () {
    return codeInjector.stop();
  });

  afterEach(function () {
    allPassed = allPassed && this.currentTest.state === 'passed';
  });
  return deferred.promise;
};

