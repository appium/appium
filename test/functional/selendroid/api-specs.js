"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('api', function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });
  it('should find and click an element', function (done) {
    // selendroid appears to have some issues with implicit waits
    // hence the timeouts
    driver
      .waitForElementByName('App', 10000).click()
      .sleep(1000)
      .elementByLinkText("Action Bar").should.eventually.exist
      .nodeify(done);
  });

  it('should be able to get logcat log type', function (done) {
    driver.logTypes().should.eventually.include('logcat')
      .nodeify(done);
  });
  it('should be able to get logcat logs', function (done) {
    driver.log('logcat').then(function (logs) {
      logs.length.should.be.above(0);
      logs[0].message.should.not.include("\n");
      logs[0].level.should.equal("ALL");
      logs[0].timestamp.should.exist;
    }).nodeify(done);
  });

  it('should be able to proxy errors', function (done) {
    driver
      .elementByCss("foobar").should.be.rejected
      .nodeify(done);
  });

  it('should be able to set location', function (done) {
    driver
      .setGeoLocation("27.17", "78.04")
      .nodeify(done);
  });

  it('should error out nicely with incompatible commands', function (done) {
    driver
      .execute("mobile: flick", [{}])
      .catch(function (err) {
        err.cause.value.origValue.should.contain('mobile:');
        throw err;
      }).should.be.rejectedWith(/status: 9/)
      .nodeify(done);
  });

});
