"use strict";

var Capabilities = require('../../lib/server/capabilities.js')
  , loggerjs = require('../../lib/server/logger')
  , logger = loggerjs.get('appium')
  , sinon = require('sinon')
  , chai = require('chai')
  , should = chai.should()
  , _ = require('underscore');

describe('capabilities', function () {
  describe('#new', function () {
    it('should convert object caps to strings', function () {
      var c = new Capabilities({app: {some: 'object'}, platformVersion: 'hi'});
      c.app.should.equal('{"some":"object"}');
    });
    it('should leave undefined, null, numbers alone', function () {
      var c = new Capabilities({appPackage: null, bob: undefined, platformVersion: 7.0});
      should.not.exist(c.appPackage);
      (typeof c.appPackage).should.equal("object");
      (typeof c.bob).should.equal("undefined");
      c.platformVersion.should.equal(7.0);
      (typeof c.platformVersion).should.equal("number");
    });
    describe('with pre-mjsonwp capabilities', function () {
      var capabilityConversion = [
          ['device', 'platformName']
        , ['version', 'platformVersion']
        ];

      beforeEach(function () {
        sinon.spy(logger, "warn");
      });
      afterEach(function () {
        logger.warn.restore();
      });

      _.each(capabilityConversion, function (item) {
        var specName = "Should return a deprecation warning when given the " +
                       JSON.stringify(item[0]) + " capability";
        it(specName, function () {
          var expected = "[DEPRECATED] The " + item[0] + " capability has " +
                       "been deprecated and will be removed.  Please use " +
                       "the " + item[1] + " capability instead.";
          var fakeCaps = {};
          fakeCaps[item[0]] = 'dontcare';
          new Capabilities(fakeCaps);
          (logger.warn.args[0][0]).should.equal(expected);
        });
      });
    });

    describe('with mjsonwp capabilities', function () {
      describe('deprecation warnings', function () {
        var newCapabilities = [
          'platformName',
          'platformVersion'
        ];

        beforeEach(function () {
          sinon.spy(logger, "warn");
        });
        afterEach(function () {
          logger.warn.restore();
        });

        _.each(newCapabilities, function (item) {
          var specName = "Should not be thrown for " + item;
          it(specName, function () {
            var fakeCaps = {};
            fakeCaps[item] = 'dontcare';
            new Capabilities(fakeCaps);
            (logger.warn.called).should.be.false;
          });
        });
      });
    });
  });
});
