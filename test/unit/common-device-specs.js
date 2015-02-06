'use strict';

var common = require('../../lib/devices/common.js')
  , checkValidLocStrat = common.checkValidLocStrat
  , chai = require('chai')
  , _  = require('underscore');

chai.should();

describe('devices/common.js', function () {
  var nullCb = function () {};

  var assertLocatorValidity = function (name, loc, includeWeb, expected) {
    var cb = function () {};
    it(name, function () {
      checkValidLocStrat(loc, includeWeb, cb).should.equal(expected);
    });
  };

  var testLocatorIsValid = function (loc, webIncluded) {
    var name = 'should treat the ' + loc + ' strategy as valid';
    assertLocatorValidity(name, loc, webIncluded, true);
  };

  var testLocatorIsInvalid = function (loc, webIncluded) {
    var name = 'should treat the ' + loc + ' strategy as invalid';
    assertLocatorValidity(name, loc, webIncluded, false);
  };

  describe('#checkValidLocStrat', function () {
    var validStrategies = [
      'xpath',
      'id',
      'name',
      'class name'
    ];

    var validWebStrats = [
      'link text',
      'css selector',
      'tag name',
      'partial link text'
    ];

    describe('in the native context', function () {

      _.each(validStrategies, function (strategy) {
        testLocatorIsValid(strategy, false);
      });

      _.each(validWebStrats, function (strategy) {
        testLocatorIsInvalid(strategy, false);
      });

      it('rejects invalid locator strategies', function () {
        checkValidLocStrat('derp', false, nullCb).should.equal(false);
      });

    });

    describe('in the web context', function () {
      _.each(validStrategies, function (strategy) {
        testLocatorIsValid(strategy, true);
      });

      _.each(validWebStrats, function (strategy) {
        testLocatorIsValid(strategy, true);
      });

      it('rejects invalid locator strategies', function () {
        var nullCb = function () {};
        checkValidLocStrat('derp', true, nullCb).should.equal(false);
      });

    });
  });
});
