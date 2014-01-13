"use strict";

var describeWd = require('../../helpers/driverblock.js').describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('active', function(h) {
  it('should return active element', function(done) {
    h.driver
      .elementsByTagName('textField').then(function(elems) {
        return elems[1];
      }).then(function(elem) {
        return h.driver
          .active().equals(elem).should.be.ok;
      }).nodeify(done);
  });
});
