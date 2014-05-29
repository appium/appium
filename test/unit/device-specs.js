"use strict";

var Device = require('../../lib/devices/device.js')
  , capConversion = require('../../lib/server/capabilities.js').capabilityConversions
  , chai = require('chai')
  , _ = require('underscore');

chai.should();

var Test = function () {
  this.init();
};

_.extend(Test.prototype, Device.prototype);

describe("device.js", function () {
  describe("#configure", function () {
    _.each(capConversion, function (newCap, cap) {
      var name = "should store the " + cap + " capability as the " + newCap + " arg";
      it(name, function () {
        var caps = {};
        caps[cap] = 'iOS';
        var testDevice = new Test();
        testDevice.configure({}, caps);
        testDevice.args[newCap].should.equal('iOS');
      });
    });
  });
});
