"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , should = require("should")
  , assert = require('assert');

describeWd('check location', function(h) {
  return it('should return the right x/y coordinates', function(done) {
    h.driver.elementByTagName('button', function(err, element) {
      assert.ok(element.value);
      element.getLocation(function(err, location) {
        assert.equal(location.x, 94);
        assert.equal(location.y, 122);
        done();
      });
    });
  });
});

describeWd('set geographic location', function(h) {
  it('should not error with valid lat/lon and no options', function(done) {
    var locationOpts = {
      latitude: -30
      , longitude: 30
    };
    h.driver.execute('mobile: setLocation', [locationOpts], function(err) {
      should.not.exist(err);
      done();
    });
  });
  it('should not error with valid lat/lon and valid options', function(done) {
    var locationOpts = {
      latitude: -30
      , longitude: 30
      , altitude: 1000
    };
    h.driver.execute('mobile: setLocation', [locationOpts], function(err) {
      should.not.exist(err);
      done();
    });
  });
    it('should error with invalid lat/lon and no options', function(done) {
    var locationOpts = {
      latitude: -150
      , longitude: 30
    };
    h.driver.execute('mobile: setLocation', [locationOpts], function(err) {
      should.exist(err);
      done();
    });
  });
});
