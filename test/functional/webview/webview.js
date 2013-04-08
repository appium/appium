/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('WebViewApp')
  , webviewTests = require("../../helpers/webview.js").buildTests
  , _ = require('underscore')
  , should = require('should');

describeWd('window handles', function(h) {
  it('getting current window should do nothing when none set', function(done) {
    h.driver.windowHandle(function(err) {
      should.exist(err);
      err.status.should.equal(23);
      done();
    });
  });
  it('getting list should work after webview open', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      done();
    });
  });
  it('window handles should be strings', function(done) {
    h.driver.windowHandles(function(err, handles) {
      handles.length.should.be.above(0);
      _.each(handles, function(handle) {
        (typeof handle).should.equal("string");
      });
      done();
    });
  });
  it('setting window should work', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      h.driver.window(handles[0], function(err) {
        should.not.exist(err);
        done();
      });
    });
  });
  it('clearing window should work', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.be.above(0);
      h.driver.window(handles[0], function(err) {
        should.not.exist(err);
        h.driver.execute("mobile: leaveWebView", function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
  it('clearing window should not work if not in webview', function(done) {
    h.driver.execute("mobile: leaveWebView", function(err) {
      should.exist(err);
      err.status.should.equal(8);
      done();
    });
  });
});

webviewTests('WebViewApp');
