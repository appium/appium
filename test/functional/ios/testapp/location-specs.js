"use strict";

var setup = require("../../common/setup-base")
  , env = require('../../../helpers/env')
  , initSession = require('../../../helpers/session').initSession
  , _ = require("underscore")
  , desired = require('./desired');

describe('testapp - location -', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return the right x/y coordinates', function (done) {
    driver
      .elementByTagName('button').getLocation().then(function (location) {
        location.x.should.equal(94);
        location.y.should.be.above(120);
      })
      .nodeify(done);
  });

  it('should not error with valid lat/lon and no options', function (done) {
    var locationOpts = {
      latitude: -30
    , longitude: 30
    };
    driver.execute('mobile: setLocation', [locationOpts])
      .nodeify(done);
  });

  it('should not error with valid lat/lon and valid options', function (done) {
    var locationOpts = {
      latitude: -30
    , longitude: 30
    , altitude: 1000
    };
    driver.execute('mobile: setLocation', [locationOpts])
      .nodeify(done);
  });

  it('should error with invalid lat/lon and no options', function (done) {
    var locationOpts = {
      latitude: -150
    , longitude: 30
    };
    driver.execute('mobile: setLocation', [locationOpts])
      .should.be.rejected
      .nodeify(done);
  });
});

describe('testapp - location services -', function () {
  var driver;
  var newDesired = _.clone(desired);
  _.extend(newDesired, {
    locationServicesAuthorized: true,
    bundleId: 'io.appium.TestApp'
  });
  setup(this, newDesired, {'no-reset': true}).then(function (d) { driver = d; });

  it('should be able to be turned on', function (done) {
    driver
      .elementByName('locationStatus').getValue().then(function (checked) {
        checked.should.equal(1);
      })
      .nodeify(done);
  });
});

describe('testapp - location services -', function () {
  var newDesired = _.clone(desired);
  _.extend(newDesired, {
    locationServicesAuthorized: true
  });
  it('should not work without bundleId', function (done) {
    initSession(newDesired, {'no-retry': true, 'no-reset': true}).setUp()
      .then(function (err) {
        err.cause.value.message.should.contain("bundleId");
        throw err;
      }).should.eventually.be.rejectedWith(/unavailable/)
      .nodeify(done);
  });
});

describe('testapp - location services -', function () {
  var driver;
  var newDesired = _.clone(desired);
  _.extend(newDesired, {
    locationServicesAuthorized: false,
    bundleId: 'io.appium.TestApp'
  });
  setup(this, newDesired, {'no-reset': true}).then(function (d) { driver = d; });

  it('should be able to be turned off', function (done) {
    driver
      .elementByName('locationStatus').getValue().then(function (checked) {
        checked.should.equal(0);
      })
      .nodeify(done);
  });
});
