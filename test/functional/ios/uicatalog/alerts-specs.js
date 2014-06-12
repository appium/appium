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

describe('uicatalog - alerts @skip-ios6', function () {

  var alertTag = env.IOS7 ? '@label' : '@value';

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  function waitForAlert() {
    // The socket.io logic below only works locally.
    if (env.SAUCE) return new Q();

    var deferred = Q.defer();
    var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
    client.on('alert', function () {
      client.disconnect();
      deferred.resolve();
    });
    return deferred.promise;
  }

  afterEach(function (done) {
    driver.back()
      .nodeify(done);
  });

  it('should detect Simple', function (done) {
    var alertReceived;
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Simple')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Simple')]")
        .click()
      .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .dismissAlert()
      .nodeify(done);
  });

  it('should detect Okay', function (done) {
    var alertReceived;
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Okay')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Okay')]")
        .click()
      .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .acceptAlert()
      .nodeify(done);
  });

  it('should detect Other', function (done) {
    var alertReceived;
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Alert Views')]").click()
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Other')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementByXPath("//UIAStaticText[contains(" + alertTag + ",'Other')]")
        .click()
      .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .dismissAlert()
      .nodeify(done);
  });
});
