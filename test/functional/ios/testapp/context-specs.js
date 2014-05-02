"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - context methods', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('getting list multiple times should not crash appium', function (done) {
    driver
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .contexts().should.eventually.have.length(1)
      .nodeify(done);
  });
  it('setting context to \'null\' should work', function (done) {
    driver.contexts().then(function (ctxs) {
      ctxs.length.should.be.equal(1);
      return ctxs[0];
    }).then(function (ctx) {
      return driver.context(ctx);
    })
    .context(null)
    .nodeify(done);
  });
  it('setting context to \'NATIVE_APP\' should work', function (done) {
    driver.contexts().then(function (ctxs) {
      ctxs.length.should.be.above(0);
      return ctxs[0];
    }).then(function (ctx) {
      return driver.context(ctx);
    })
    .context('NATIVE_APP')
    .nodeify(done);
  });

  it('setting context to non-existent context should return \'NoSuchContext\' (status: 35)', function (done) {
    driver
      .context("WEBVIEW_42")
      .should.be.rejectedWith(/status: 35/)
      .nodeify(done);
  });
});

describe('testapp - window methods', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('getting list multiple times should not crash appium', function (done) {
    driver
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .windowHandles().should.eventually.have.length(0)
      .nodeify(done);
  });
});
