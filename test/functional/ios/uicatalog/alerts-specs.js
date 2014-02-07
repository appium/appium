"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , io = require('socket.io-client');

// setup websocket client...
var options = {
  transports: ['websocket'],
  'force new connection': true
};

describe('uicatalog - alerts -', function () {

  var alertTag = env.IOS7 ? '@label' : '@value';

  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Show Simple', function (done) {
      var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
      client.on('alert', function () {
        client.disconnect();
        done();
      });
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .sleep(10000)
        .elementsByXPath("//text[contains(" + alertTag + ",'Show Simple')]")
        .then(function (els) { return els[1]; }).click()
        .done();
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Show OK-Cancel', function (done) {
      var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
      client.on('alert', function () {
        client.disconnect();
        done();
      });
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .elementsByXPath("//text[contains(" + alertTag + ",'Show OK-Cancel')]")
          .then(function (els) { return els[1]; }).click()
        .done();
    });
  });
  describe('alert dialog detection', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should detect Show Custom', function (done) {
      var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
      client.on('alert', function () {
        client.disconnect();
        done();
      });
      driver
        .elementByXPath("//text[contains(@label,'Alerts')]").click()
        .elementsByXPath("//text[contains(" + alertTag + ",'Show Custom')]")
          .then(function (els) { return els[1]; }).click()
        .done();
    });
  });
});
