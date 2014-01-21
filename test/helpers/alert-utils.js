"use strict";

exports.okIfAlert = function(driver) {
  return driver
    .alertText()
    .then(function(text) {
      if (text) {
        return driver.acceptAlert();
      }
    })
    .catch(function() {});
};
