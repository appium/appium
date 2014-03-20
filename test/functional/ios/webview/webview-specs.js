"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore');

describe('webview - webview -', function () {

  describe('contexts', function () {
    var driver;

    setup(this, desired).then(function (d) { driver = d; });

    it('getting current context should return null when none set', function (done) {
      driver.currentContext().should.eventually.equal(null)
        .nodeify(done);
    });
    it('getting list should work after webview open', function (done) {
      driver.contexts().should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('getting list twice should not crash appium', function (done) {
      driver
        .contexts().should.eventually.have.length.above(0)
        .contexts().should.eventually.have.length.above(0)
        .nodeify(done);
    });
    it('contexts should be strings', function (done) {
      driver.contexts().then(function (ctxs) {
        ctxs.length.should.be.above(0);
        _.each(ctxs, function (ctx) {
          (typeof ctx).should.equal("string");
        });
      }).nodeify(done);
    });
    it('setting context to \'WEBVIEW_1\' should work', function (done) {
      driver.contexts().should.eventually.have.length.above(0)
        .context("WEBVIEW_1")
        .get("http://google.com")
        .sleep(500)
        .title()
        .should.eventually.equal("Google")
        .nodeify(done);
    });
    it('setting context to \'null\' should work', function (done) {
      driver.contexts().then(function (ctxs) {
        ctxs.length.should.be.above(0);
        return ctxs[0];
      }).then(function (ctx) {
        return driver.context(ctx);
      })
      .context(null)
      .nodeify(done);
    });
    it('returning to \'NATIVE_APP\' should work', function (done) {
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

    it('switching back and forth between native and webview contexts should work', function (done) {
      driver
        .contexts()
        .context("WEBVIEW_1")
        .get("http://google.com")
        .sleep(500)
        .title()
        .should.eventually.equal("Google")
        .context("NATIVE_APP")
        .context("WEBVIEW_1")
        .get("https://saucelabs.com/home")
        .sleep(500)
        .title()
        .should.eventually.equal("Sauce Labs: Selenium Testing, Mobile Testing, JS Unit Testing and More")
        .nodeify(done);
    });
  });


  // TODO: remove in appium 1.0
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
