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
    var warning = function (capability) {
      return ("[DEPRECATED] The '" + capability + "' capability is " +
              "deprecated, and will be removed in Appium 1.0");
    };
    var oldCapabilities = [
      'device'
    , 'version'
    , 'app-package'
    ];

    beforeEach(function () {
      sinon.spy(logger, "warn");
    });
    afterEach(function () {
      logger.warn.restore();
    });

    _.each(oldCapabilities, function (item) {
      var specName = "Should return a deprecation warning when given the " +
                     JSON.stringify(item) + " capability";
      it(specName, function () {
        var fakeCaps = {};
        fakeCaps[item] = 'dontcare';
        new Capabilities(fakeCaps);
        (logger.warn.args[0][0]).should.equal(warning(item));
      });
    });
  });
});