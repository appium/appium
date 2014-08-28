"use strict";

var ChaiAsserter = require('./asserter').ChaiAsserter;

function textCleared(el) {
  return new ChaiAsserter(function () {
    return el.text().should.become('');
  });
}

var safeClear = function (el, remainingAttempts) {
  if (typeof remainingAttempts !== 'number') remainingAttempts = 3;
  return el
    .clear()
    .waitFor(textCleared(el), 3000)
    .catch(function (err) {
      if (remainingAttempts <= 0) throw err;
      return safeClear(el, remainingAttempts - 1);
    });
};

module.exports = safeClear;
