"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    _ = require('underscore');

describe('network connection details @skip-ci', function () {
  var driver;
  setup(this, _.defaults({
    fullReset: true
  }, desired)).then(function (d) { driver = d; });

  it('should get airplane mode', function (done) {
    driver
      .setNetworkConnection(1)
      .getNetworkConnection().should.eventually.become(1)
      .nodeify(done);
  });

  it('should get wifi alone', function (done) {
    driver
      .setNetworkConnection(2)
      .getNetworkConnection().should.eventually.become(2)
      .nodeify(done);
  });

  it('should get data alone', function (done) {
    driver
      .setNetworkConnection(4)
      .getNetworkConnection().should.eventually.become(4)
      .nodeify(done);
  });

  it('should get wifi and data', function (done) {
    driver
      .setNetworkConnection(6)
      .getNetworkConnection().should.eventually.become(6)
      .nodeify(done);
  });
});
