"use strict";

var setup = require("../../common/setup-base")
  , Readable = require('stream').Readable
  , Unzip = require('unzip')
  , desired = require("./desired");

describe("apidemos - file", function () {
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
  it('should pull a folder', function (done) {
    var stringData = "random string data " + Math.random();
    var base64Data = new Buffer(stringData).toString('base64');
    var remotePath0 = '/data/local/tmp/remote0.txt';
    var remotePath1 = '/data/local/tmp/remote1.txt';

    var entryCount = 0;

    driver
      .pushFile(remotePath0, base64Data)
      .pushFile(remotePath1, base64Data)
      .pullFolder('/data/local/tmp')
      .then(function (data) {
        var zipStream = new Readable();
        zipStream._read = function noop() {};
        zipStream
          .pipe(Unzip.Parse())
          .on('entry', function (entry) {
            entryCount++;
            entry.autodrain();
          })
          .on('close', function () {
            entryCount.should.be.above(1);
            done();
          });

        zipStream.push(data, 'base64');
        zipStream.push(null);
      });

  });
});
