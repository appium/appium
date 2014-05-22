"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , io = require('socket.io-client')
  , Q = require('q');

// setup websocket client...
var options = {
  transports: ['websocket'],
  'force new connection': true
};

//TODO waitForAlert not compatible with sauce, do it another way.
describe('uicatalog - alerts @skip-ios6 @skip-ci', function () {

  var alertTag = env.IOS7 ? '@label' : '@value';

  function waitForAlert() {
    var deferred = Q.defer();
    var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
    client.on('alert', function () {
      client.disconnect();
      deferred.resolve();
    });
    return deferred.promise;
  }

  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Simple', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
        .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Simple')]", 10000, 1000)
        .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Simple')]")
          .click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Okay', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
        .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Okay')]", 10000, 1000)
        .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Okay')]")
          .click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Other', function (done) {
      driver
        .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
        //.sleep(60000)
        .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Other')]", 10000, 1000)
        .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Other')]")
          .click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
});
