"use strict";

var setup = require("./setup")
  , _ = require('underscore');

describe('window handles', function() {
  var browser;

  setup(this)
    .then( function(_browser) { browser = _browser; } );

  it('getting current window should do nothing when none set', function(done) {
    browser.windowHandle().should.be.rejectedWith(/status: 23/)
      .nodeify(done);
  });
  it('getting list should work after webview open', function(done) {
    browser.windowHandles().should.eventually.have.length.above(0)
      .nodeify(done);
  });
  it('getting list twice should not crash appium', function(done) {
    browser
      .windowHandles().should.eventually.have.length.above(0)
      .windowHandles().should.eventually.have.length.above(0)
      .nodeify(done);
  });
  it('window handles should be strings', function(done) {
    browser.windowHandles().then(function(handles) {
      handles.length.should.be.above(0);
      _.each(handles, function(handle) {
        (typeof handle).should.equal("string");
      });
    }).nodeify(done);
  });
  it('setting window should work', function(done) {
    browser.windowHandles().then(function(handles) {
      handles.length.should.be.above(0);
      return handles[0];
    }).then(function(handle) {
      return browser.window(handle);
    }).nodeify(done);
  });
  it('clearing window should work', function(done) {
    browser.windowHandles().then(function(handles) {
      handles.length.should.be.above(0);
      return handles[0];
    }).then(function(handle) {
      return browser.window(handle);
    }).execute("mobile: leaveWebView")
    .nodeify(done);
  });
  it('clearing window should not work if not in webview', function(done) {
    browser
      .execute("mobile: leaveWebView").should.be.rejectedWith(/status: 8/)
      .nodeify(done);
  });
});
