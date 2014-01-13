"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it;

describeWd('window handles', function(h) {
  it('getting handles should do nothing when no webview open', function(done) {
    h.driver
      .windowHandles().should.eventually.have.length(0)
      .nodeify(done);
  });
});
