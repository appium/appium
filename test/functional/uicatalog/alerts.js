"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
  , appiumPort = process.env.APPIUM_PORT || 4723
  , io = require('socket.io-client');

  // setup websocket client...
  var options ={
    transports: ['websocket'],
    'force new connection': true
  };

describeWd('alert dialog detection', function(h) {
  it('should detect Show Simple', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    h.driver
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show Simple')]")
      .then(function(els) { return els[1]; }).click()
      .done();
  });
});
describeWd('alert dialog detection', function(h) {
  it('should detect Show OK-Cancel', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    h.driver
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show OK-Cancel')]")
        .then(function(els) { return els[1]; }).click()
      .done();
  });
});
describeWd('alert dialog detection', function(h) {
  it('should detect Show Custom', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    client.on('alert', function() {
      client.disconnect();
      done();
    });
    h.driver
      .elementByXPath("//text[contains(@label,'Alerts')]").click()
      .elementsByXPath("//text[contains(@value,'Show Custom')]")
        .then(function(els) { return els[1]; }).click()
      .done();
  });
});
