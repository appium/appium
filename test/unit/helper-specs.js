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
  });
});