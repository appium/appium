/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('get attribute', function(h) {
  it('should be able to find text attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('text', function(err, text) {
        should.not.exist(err);
        text.should.equal("Animation");
        done();
      });
    });
  });
  it('should be able to find name attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('name', function(err, text) {
        should.not.exist(err);
        text.should.equal("Animation");
        done();
      });
    });
  });
  it('should be able to find name attribute, falling back to text', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByTagName('text', function(err, els) {
          should.not.exist(err);
          els[1].getAttribute('name', function(err, text) {
            should.not.exist(err);
            text.should.equal("Bouncing Balls");
            done();
          });
        });
      });
    });
  });
  it('should be able to find displayed attribute', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.getAttribute('displayed', function(err, val) {
        should.not.exist(err);
        val.should.equal(true);
        done();
      });
    });
  });
  it('should be able to find displayed attribute through normal func', function(done) {
    h.driver.elementByName('Animation', function(err, el) {
      should.not.exist(err);
      el.displayed(function(err, val) {
        should.not.exist(err);
        val.should.equal(true);
        done();
      });
    });
  });
  // TODO: tests for checkable, checked, clickable, focusable, focused,
  // longClickable, scrollable, selected
});
