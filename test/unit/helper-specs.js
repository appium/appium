"use strict";

var helpers = require('../../lib/helpers.js')
  , logger = require('../../lib/server/logger.js').get('appium')
  , chai = require('chai')
  , should = chai.should()
  , sinon = require('sinon');

describe("Helpers", function () {
  describe("#generateDeprecationWarning", function () {
    describe("with a function", function () {
      it("emits the function message", function () {
        var deprecated = "oldFunction";
        var replacement = "newFunction";
        var expected = "[DEPRECATED] The " + deprecated + " function has " +
                       "been deprecated and will be removed.  Please use " +
                       "the " + replacement + " function instead.";
        var warning = helpers.generateDeprecationWarning('function',
                                                         deprecated,
                                                         replacement);
        warning.should.equal(expected);
      });
    });

    describe("with a desired capability", function () {
      it("emits the capability message", function () {
        var deprecated = "oldCap";
        var replacement = "newCap";
        var expected = "[DEPRECATED] The " + deprecated + " capability has " +
                       "been deprecated and will be removed.  Please use " +
                       "the " + replacement + " capability instead.";
        var warning = helpers.generateDeprecationWarning('capability',
                                                         deprecated,
                                                         replacement);
        warning.should.equal(expected);
      });
    });
  });
  describe("#produceDeprecationWarning", function () {
    beforeEach(function () {
      helpers.clearWarnings();
      sinon.spy(logger, 'warn');
    });
    afterEach(function () {
      logger.warn.restore();
    });
    it('sends a message to warn', function () {
      helpers.emitDeprecationWarning('function', 'old', 'new');
      logger.warn.called.should.equal(true);
    });
    it('is only called once per run', function () {
      helpers.emitDeprecationWarning('function', 'old', 'new');
      helpers.emitDeprecationWarning('function', 'old', 'new');
      logger.warn.called.should.equal(true);
    });
  });
});