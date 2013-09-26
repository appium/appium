"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it
  , assert = require('assert');

describeWd('active', function(h) {
  return it('should return active element', function(done) {
    h.driver.elementsByTagName('textField', function(err, elems) {
      var elem = elems[1];
      // click element to make it active
      elem.click(function() {
        h.driver.active(function(err, activeElem) {
          assert.equal(activeElem.value, elem.value);
          done();
        });
      });
    });
  });
});
