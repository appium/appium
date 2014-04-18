'use strict';

var common = require('../../lib/devices/common.js')
  , checkValidLocStrat = common.checkValidLocStrat
  , clearWarnings = require('../../lib/helpers.js').clearWarnings
  , loggerjs = require('../../lib/server/logger')
  , logger = loggerjs.get('appium');

var _  = require('underscore')
  , sinon = require('sinon');

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

  var warningTemplate = _.template(
    "[DEPRECATED] The <%= deprecated %> locator strategy has been " +
    "deprecated and will be removed.  Please use the " +
    "<%= replacement %> locator strategy instead."
    );

  var expectedWarning = function (selector, replacement) {
    return warningTemplate({deprecated: selector, replacement: replacement});
  };

  describe('#checkValidLocStrat', function () {
    var validStrategies = [
      'xpath',
      'id',
      'name',
      'dynamic',
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
