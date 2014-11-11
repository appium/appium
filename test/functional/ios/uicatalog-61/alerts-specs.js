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

describe('uicatalog - alerts @skip-ios7up', function () {
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

  before(function (done) {
    driver
      .elementByXPath("//UIAStaticText[contains(@label,'Alerts')]")
        .click()
      .nodeify(done);
  });

  it('should detect Show Simple', function (done) {
    var alertReceived;
    driver
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Show Simple')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementsByXPath("//UIAStaticText[contains(" + alertTag + ",'Show Simple')]")
      .at(1).click()
      // .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .dismissAlert()
      .nodeify(done);
  });

  it('should detect Show OK-Cancel', function (done) {
    var alertReceived;
    driver
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Show OK-Cancel')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementsByXPath("//UIAStaticText[contains(" + alertTag + ",'Show OK-Cancel')]")
      .at(1).click()
      // .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .acceptAlert()
      .nodeify(done);
  });

  it('should detect Show Custom', function (done) {
    var alertReceived;
    driver
      .waitForElementByXPath("//UIAStaticText[contains(" + alertTag + ",'Show Custom')]", 10000, 1000)
      .then(function () { alertReceived = waitForAlert(); })
      .elementsByXPath("//UIAStaticText[contains(" + alertTag + ",'Show Custom')]")
      .at(1).click()
      // .alertText().should.eventually.include('A Short Title Is Best')
      .resolve(alertReceived)
      .dismissAlert()
      .nodeify(done);
  });
});
