"use strict";

var env = require('../../helpers/env')
  , setup = require('./setup')
  , io = require('socket.io-client');

  // setup websocket client...
  var options ={
    transports: ['websocket'],
    'force new connection': true
  };

describe('alert dialog detection', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should detect Show Simple', function(done) {
    var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    browser
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show Simple')]")
      .then(function(els) { return els[1]; }).click()
      .done();
  });
});
describe('alert dialog detection', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should detect Show OK-Cancel', function(done) {
    var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    browser
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show OK-Cancel')]")
        .then(function(els) { return els[1]; }).click()
      .done();
  });
});
describe('alert dialog detection', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  it('should detect Show Custom', function(done) {
    var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    browser
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show Custom')]")
        .then(function(els) { return els[1]; }).click()
      .done();
  });
});
