"use strict";

var setup = require("../common/setup-base"),
  desired = require('./desired');

describe('selendroid - network-connection -', function () {

  describe('toggle flight mode twice', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });
    it('should toggle the airplane mode twice', function (done) {
      driver
        .getNetworkConnection()
        .then(function (type) {
          var newType = (type % 2) + 1;
          driver
            .setNetworkConnection(newType)
            .getNetworkConnection()
            .then(function (updatedType) {
              (updatedType % 2).should.equal(newType % 2);
              driver.setNetworkConnection(type)
                .should.become(type).nodeify(done);
            });
        });
    });
  });
});
