"use strict";

var chai = require('chai'),
    Asserter = require('wd').Asserter;

var tagChaiAssertionError = function (err) {
  err.retriable = err instanceof chai.AssertionError;
  throw err;
};
exports.tagChaiAssertionError = tagChaiAssertionError;

exports.ChaiAsserter = function (assertFunc) {
    return new Asserter(function (driver) {
        return assertFunc(driver).catch(tagChaiAssertionError);
    });
};