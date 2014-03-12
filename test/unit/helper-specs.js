"use strict";

var helpers = require('../../lib/helpers.js');

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
      it("emits the function message", function () {
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
});