"use strict";

var setup = require("../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore');

describe('webview - webview -', function () {

  describe('window handles', function () {
    var driver;

    setup(this, desired).then(function (d) { driver = d; });

    it('getting current window should do nothing when none set', function (done) {
      driver.windowHandle().should.be.rejectedWith(/status: 23/)
        .nodeify(done);
    });
    it('getting list should work after webview open', function (done) {
      driver.windowHandles().should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('getting list twice should not crash appium', function (done) {
      driver
        .windowHandles().should.eventually.have.length.above(0)
        .windowHandles().should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('window handles should be strings', function (done) {
      driver.windowHandles().then(function (handles) {
        handles.length.should.be.above(0);
        _.each(handles, function (handle) {
          (typeof handle).should.equal("string");
        });
      }).nodeify(done);
    });
    it('setting window should work', function (done) {
      driver.windowHandles().then(function (handles) {
        handles.length.should.be.above(0);
        return handles[0];
      }).then(function (handle) {
        return driver.window(handle);
      }).nodeify(done);
    });
    it('clearing window should work', function (done) {
      driver.windowHandles().then(function (handles) {
        handles.length.should.be.above(0);
        return handles[0];
      }).then(function (handle) {
        return driver.window(handle);
      }).execute("mobile: leaveWebView")
      .nodeify(done);
    });
    it('clearing window should not work if not in webview', function (done) {
      driver
        .execute("mobile: leaveWebView").should.be.rejectedWith(/status: 8/)
        .nodeify(done);
    });
  });
});
