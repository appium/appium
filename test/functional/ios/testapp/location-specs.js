"use strict";

var setup = require("../../common/setup-base")
  , env = require('../../../helpers/env')
  , initSession = require('../../../helpers/session').initSession
  , _ = require("underscore")
  , desired = require('./desired');

describe('testapp - location - 1', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return the right x/y coordinates', function (done) {
    driver
      .elementByClassName('UIAButton').getLocation().then(function (location) {
        location.x.should.equal(94);
        location.y.should.be.above(120);
      })
      .nodeify(done);
  });

  it('should not error with valid lat/lon and no options', function (done) {
    driver
      .setGeoLocation(-30, 30)
      .nodeify(done);
  });

  it('should error with invalid lat/lon and no options', function (done) {
    driver
      .setGeoLocation(-150, 30)
      .should.be.rejected
      .nodeify(done);
  });
});

describe('testapp - location - 2', function () {
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

describe('testapp - location - 3', function () {
  var newDesired = _.clone(desired);
  _.extend(newDesired, {
    locationServicesAuthorized: true
  });
  var title = this.title;
  it('should not work without bundleId', function (done) {
    initSession(newDesired, {'no-retry': true, 'no-reset': true})
      .setUp(title)
      .then(function (err) {
        err.cause.value.message.should.contain("bundleId");
        throw err;
      }).should.eventually.be.rejectedWith(/unavailable/)
      .nodeify(done);
  });
});

describe('testapp - location - 4', function () {
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
