"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - execute @skip-ios7up', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should do UIAutomation commands if not in web frame', function (done) {
    driver
      .execute("UIATarget.localTarget().frontMostApp().bundleID()")
        .should.eventually.include(".UICatalog")
      .nodeify(done);
  });
  it('should not fail if UIAutomation command blows up', function (done) {
    driver
      .execute("UIATarget.foobarblah()")
        .should.be.rejectedWith(/status: 17/)
      .nodeify(done);
  });
  it('should not fail with quotes', function (done) {
    driver.execute('$.log(\'hi\\\'s\');')
      .nodeify(done);
  });
});
