"use strict";

var helpers = require('../../lib/helpers.js')
  , logger = require('../../lib/server/logger.js').get('appium')
  , chai = require('chai')
  , sinon = require('sinon');

chai.should();

describe("Helpers", function () {
  describe("#formatDeprecationWarning", function () {
    describe("with a function", function () {
      it("emits the function message", function () {
        var deprecated = "oldFunction";
        var replacement = "newFunction";
        var expected = "[DEPRECATED] The " + deprecated + " function has " +
                       "been deprecated and will be removed.  Please use " +
                       "the " + replacement + " function instead.";
        var warning = helpers.formatDeprecationWarning('function',
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
        var warning = helpers.formatDeprecationWarning('capability',
          deprecated,
          replacement);
        warning.should.equal(expected);
      });
    });

    describe("without a replacement", function () {
      it("returns only the deprecation sentence", function () {
        var expected = "[DEPRECATED] The xml return type has been deprecated " +
                       "and will be removed.";
        helpers.formatDeprecationWarning('return type', 'xml').should.equal(expected);
      });
    });
  });
  describe("#logDeprecationWarning", function () {
    beforeEach(function () {
      helpers.clearWarnings();
      sinon.spy(logger, 'warn');
    });
    afterEach(function () {
      logger.warn.restore();
    });
    it('sends a message to warn', function () {
      helpers.logDeprecationWarning('function', 'old', 'new');
      logger.warn.called.should.equal(true);
    });
    it('is only called once per run', function () {
      helpers.logDeprecationWarning('function', 'old', 'new');
      helpers.logDeprecationWarning('function', 'old', 'new');
      logger.warn.calledOnce.should.equal(true);
    });
    it('logs each message', function () {
      helpers.logDeprecationWarning('function', 'old', 'new');
      helpers.logDeprecationWarning('function', 'YeOlde', 'Moderne');
      logger.warn.calledTwice.should.equal(true);
    });
  });
  describe("#logFinalDeprecationWarning", function () {
    beforeEach(function () {
      helpers.clearWarnings();
      sinon.spy(logger, 'warn');
    });
    afterEach(function () {
      logger.warn.restore();
    });
    var warning = "[DEPRECATED] You used 1 deprecated capabilities during" +
                  " this session.  Please check the logs as they will be" +
                  " removed in a future version of Appium.";
    it('logs a message when dep warnings happened', function () {
      helpers.logDeprecationWarning('function', 'old', 'new');
      helpers.logFinalDeprecationWarning();
      logger.warn.args[1][0].should.equal(warning);
    });
    it('does nothing if no dep warnings happened', function () {
      helpers.logFinalDeprecationWarning();
      logger.warn.called.should.equal(false);
    });
  });
  describe('xcode version', function () {
    it('parses xcode version with space', function () {
      var actual = "/Applications/ Xcode 6.1.1.app/Contents/Developer";
      var expected = "/Applications/\\ Xcode\\ 6.1.1.app/Contents/Developer";
      helpers.escapeSpace(actual).should.equal(expected);
    });
  });
});
