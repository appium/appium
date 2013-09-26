"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
  , should = require('should')
  , _s = require('underscore.string')
  , assert = require('assert')
  , appiumPort = process.env.APPIUM_PORT || 4723
  , io = require('socket.io-client');

describeWd('alert dialog detection', function(h) {
  // setup websocket client...
  var options ={
    transports: ['websocket'],
    'force new connection': true
  };

  it('should detect Show Simple', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    h.driver.elementByXPath("//text[contains(@label,'Alerts')]", function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByXPath("//text[contains(@value,'Show Simple')]", function(err, els) {
          should.not.exist(err);
          client.on('alert', function() {
            client.disconnect();
            done();
          });
          els[1].click(function(err) {
            should.not.exist(err);
          });
        });
      });
    });
  });

  it('should detect Show OK-Cancel', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    h.driver.elementByXPath("//text[contains(@label,'Alerts')]", function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByXPath("//text[contains(@value,'Show OK-Cancel')]", function(err, els) {
          should.not.exist(err);
          client.on('alert', function() {
            client.disconnect();
            done();
          });
          els[1].click(function(err) {
            should.not.exist(err);
          });
        });
      });
    });
  });

  it('should detect Show Custom', function(done) {
    var client = io.connect('http://127.0.0.1:' + appiumPort, options);
    h.driver.elementByXPath("//text[contains(@label,'Alerts')]", function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByXPath("//text[contains(@value,'Show Custom')]", function(err, els) {
          should.not.exist(err);
          client.on('alert', function() {
            client.disconnect();
            done();
          });
          els[1].click(function(err) {
            should.not.exist(err);
          });
        });
      });
    });
  });
});
