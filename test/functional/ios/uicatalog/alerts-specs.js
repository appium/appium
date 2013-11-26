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

describe('uicatalog - alerts -', function () {

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

    it('should detect Show Simple', function (done) {
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .waitForElementByXPath("//text[contains(" + alertTag + ",'Show Simple')]", 10000, 1000)
        .elementsByXPath("//text[contains(" + alertTag + ",'Show Simple')]")
        .at(1).click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Show OK-Cancel', function (done) {
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .waitForElementByXPath("//text[contains(" + alertTag + ",'Show OK-Cancel')]", 10000, 1000)
        .elementsByXPath("//text[contains(" + alertTag + ",'Show OK-Cancel')]")
        .at(1).click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Show Custom', function (done) {
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .waitForElementByXPath("//text[contains(" + alertTag + ",'Show Custom')]", 10000, 1000)
        .elementsByXPath("//text[contains(" + alertTag + ",'Show Custom')]")
        .at(1).click()
        .resolve(waitForAlert())
        .nodeify(done);
    });
  });
});
