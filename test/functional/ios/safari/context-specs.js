"use strict";
var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base");

describe('safari - context (' + env.DEVICE + ') @skip-ios6', function () {
  var driver;
  var desired = {
    browserName: 'safari',
    nativeWebTap: true
  };
  setup(this, desired).then(function (d) { driver = d; });

  it('getting current context should work initially', function (done) {
    driver
      .sleep(500)
      .currentContext().should.eventually.be.fulfilled
      .nodeify(done);
  });
});
