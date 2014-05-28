"use strict";

var env = require('../../../helpers/env'),
    Q = require('q');

module.exports = function (driver) {

  function back(driver, depth) {
    if (depth < 0) return new Q();
    return driver
      .setImplicitWaitTimeout(0)
      .elementByNameOrNull("Animation")
      .then(function (el) {
        if (el) return;
        else {
          return driver.back().then(function () {
            back(driver, depth - 1);
          });
        }
      });
  }
  return back(driver, 3).setImplicitWaitTimeout(env.IMPLICIT_WAIT_TIMEOUT);
};

// module.exports = function (driver) {
//   return driver.resetApp();
// };