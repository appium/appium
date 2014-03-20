'use strict';

var common = require('../../lib/devices/common.js')
  , checkValidLocStrat = common.checkValidLocStrat
  , clearWarnings = require('../../lib/helpers.js').clearWarnings
  , loggerjs = require('../../lib/server/logger')
  , logger = loggerjs.get('appium');

var _  = require('underscore')
  , chai = require('chai')
  , should = chai.should()
  , sinon = require('sinon');

describe('devices/common.js', function () {
  var null_cb = function () {};
  
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
    var valid_strategies = [
      'xpath',
      'id',
      'name',
      'dynamic',
      'tag name',
      'class name'
    ];

    var valid_web_strats = [
      'link text',
      'css selector',
      'partial link text'
    ];

    describe('in the native context', function () {

      _.each(valid_strategies, function (strategy) {
        testLocatorIsValid(strategy, false);
      });

      _.each(valid_web_strats, function (strategy) {
        testLocatorIsInvalid(strategy, false);
      });

      it('rejects invalid locator strategies', function () {
        checkValidLocStrat('derp', false, null_cb).should.equal(false);
      });

      describe('single context strategy', function () {
        beforeEach(function () {
          clearWarnings();
          sinon.spy(logger, 'warn');
        });
        afterEach(function () {
          logger.warn.restore();
        });
        describe('tag name', function () {
          assertLocatorValidity('is valid', 'tag name', false, true);
          it('emits a deprecation warning', function () {
            var warning = expectedWarning('tag name', 'class name');
            checkValidLocStrat('tag name', false, null_cb);
            logger.warn.called.should.equal(true);
            logger.warn.args[0][0].should.equal(warning);
          });
        });
      });
    });

    describe('in the web context', function () {
      _.each(valid_strategies, function (strategy) {
        testLocatorIsValid(strategy, true);
      });

      _.each(valid_web_strats, function (strategy) {
        testLocatorIsValid(strategy, true);
      });

      it('rejects invalid locator strategies', function () {
        var null_cb = function () {};
        checkValidLocStrat('derp', true, null_cb).should.equal(false);
      });

      describe('single context strategy', function () {
        beforeEach(function () {
          clearWarnings();
          sinon.spy(logger, 'warn');
        });
        afterEach(function () {
          logger.warn.restore();
        });

        describe('tag name', function () {
          it('does not log a deprecation warning', function () {
            checkValidLocStrat('tag name', true, null_cb);
            logger.warn.called.should.equal(false);
          });
        });
      });
    });
  });
});