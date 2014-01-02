"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it;

describeWd('execute', function(h) {
  it('should do UIAutomation commands if not in web frame', function(done) {
    h.driver
      .execute("UIATarget.localTarget().frontMostApp().bundleID()")
        .should.eventually.include(".UICatalog")
      .nodeify(done);
  });
  it('should not fail if UIAutomation command blows up', function(done) {
    h.driver
      .execute("UIATarget.foobarblah()")
        .should.be.rejectedWith(/status: 17/)
      .nodeify(done);
  });
  it('should not fail with quotes', function(done) {
    h.driver.execute('console.log(\'hi\\\'s\');')
      .nodeify(done);
  });
});
