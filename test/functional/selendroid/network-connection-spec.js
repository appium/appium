"use strict";

var setup = require("../common/setup-base"),
  desired = require('./desired');

describe('selendroid - network-connection -', function () {

  describe('toggle flight mode', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });
    it('should toggle the airplane mode', function (done) {
      driver
        .getNetworkConnection()
        .then(function (type) {
          var newType = (type % 2) + 1;
          return driver
            .setNetworkConnection(newType)
            .getNetworkConnection()
              .should.become(newType);
        }).nodeify(done);
    });
  });
});
