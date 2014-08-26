// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
"use strict";

var path = require('path')
  , _ = require('underscore')
  , IOS = require('../../lib/devices/ios/ios.js')
  , expect = require('chai').expect;

describe('IOS', function () {
  var device;

  beforeEach(function () {
    device = new IOS();
  });

  describe('#proxy()', function () {
    beforeEach(function () {
      // we'd like to test ios.proxy; mock instruments
      device.commandProxy = {};
      device.commandProxy.sendCommand = function (cmd, cb) {
        // let's pretend we've got some latency here.
        var to = Math.round(Math.random() * 10);
        setTimeout(function () { cb([cmd, to]); }, to);
      };
    });

    return it('should execute one command at a time keeping the seq right', function (done) {
      var intercept = []
        , iterations = 100
        , check = function (err, result) {
          intercept.push(result);
          if (intercept.length >= iterations) {
            for (var x = 0; x < iterations; x++) {
              intercept[x][0].should.equal('' + x);
            }
            done();
          }
        };

      for (var i = 0; i < iterations; i++) {
        device.proxy("" + i, check);
      }
    });
  });

  describe('#parseLocalizableStrings()', function () {
    var stubApp = path.resolve(__dirname, '../fixtures/localization_tests/StubApp.app');

    beforeEach(function () {
      _.extend(device.args, {
        language : 'en'
        , app : stubApp
      });
    });

    it('should return a dictionary', function (done) {
      device.parseLocalizableStrings(function () {
        device.localizableStrings.should.eql({ 'main.button.computeSum' : 'Compute Sum' });
        done();
      });
    });
  });

  describe('io#configure', function () {
    var getCaps = function () {
      return {platformName: 'iOS', platformVersion: '7.1',
              deviceName: 'iPhone Simulator', bundleId: 'com.test.foo',
              udid: '132412341234'};
    };

    it('should work with just a bundleId', function (done) {
      var iosDevice = new IOS();
      iosDevice.configure(getCaps(), {}, function (err) {
        expect(err).to.be.undefined;
        done();
      });
    });

    it('should work with app field as bundleId', function (done) {
      var iosDevice = new IOS();
      var caps = getCaps();
      caps.app = caps.bundleId;
      caps.bundleId = undefined;
      iosDevice.configure(caps, {}, function (err) {
        expect(err).to.be.undefined;
        done();
      });
    });
  });
});
