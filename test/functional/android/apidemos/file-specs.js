"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("apidemos - push & pull file -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should push and pull a file', function (done) {
    var stringData = "random string data " + Math.random();
    var base64Data = new Buffer(stringData).toString('base64');
    var remotePath = '/data/local/tmp/remote.txt';

    driver
      .pushFile(remotePath, base64Data)
      .pullFile(remotePath)
      .then(function (remoteData64) {
        var remoteData = new Buffer(remoteData64, 'base64').toString();
        remoteData.should.equal(stringData);
      })
      .nodeify(done);
  });
});
