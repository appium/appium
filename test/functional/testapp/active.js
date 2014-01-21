"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('testapp - active -', function() {
  var driver;
  setup(this, desired).then( function(d) { driver = d; } );

  it('should return active element', function(done) {
    driver
      .elementsByTagName('textField').then(function(elems) {
        return elems[1];
      }).then(function(elem) {
        return driver
          .active().equals(elem).should.be.ok;
      }).nodeify(done);
  });
});
