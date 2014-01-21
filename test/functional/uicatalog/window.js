"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - reset -', function() {

  describe('window handles', function() {
    var driver;
    setup(this, desired).then( function(d) { driver = d; } );

    it('getting handles should do nothing when no webview open', function(done) {
      driver
        .windowHandles().should.eventually.have.length(0)
        .nodeify(done);
    });
  });
});
