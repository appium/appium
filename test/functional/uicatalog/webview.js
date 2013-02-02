/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require('should');

describeWd('window handles', function(h) {
  it('getting current window should do nothing when none set', function(done) {
    h.driver.windowHandle(function(err) {
      should.exist(err);
      err.status.should.equal(23);
      done();
    });
  });
  it('getting handles should do nothing when no webview open', function(done) {
    h.driver.windowHandles(function(err, handles) {
      should.not.exist(err);
      handles.length.should.equal(0);
      done();
    });
  });
  it('getting list should work after webview open', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          done();
        });
      });
    });
  });
  it('setting window should work', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          h.driver.window(handles[0], function(err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });
  it('clearing window should work', function(done) {
    h.driver.elementByName('Web, Use of UIWebView', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.windowHandles(function(err, handles) {
          should.not.exist(err);
          handles.length.should.be.above(0);
          h.driver.window(handles[0], function(err) {
            should.not.exist(err);
            h.driver.frame(null, function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });
  });
});
