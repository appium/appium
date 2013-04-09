/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , badAppPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debugz.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , driverBlock = require("../../helpers/driverblock.js")
  , describeWd = driverBlock.describeForApp(appPath, "android", appPkg, appAct)
  , describeBad = driverBlock.describeForApp(badAppPath, "android", appPkg,
      appAct)
  , should = require('should');

describeWd('basic', function(h) {
  it('should get device size', function(done) {
    h.driver.getWindowSize(function(err, size) {
      should.not.exist(err);
      size.width.should.be.above(0);
      size.height.should.be.above(0);
      done();
    });
  });
  it('should die with short command timeout', function(done) {
    var params = {timeout: 3};
    h.driver.execute("mobile: setCommandTimeout", [params], function(err) {
      should.not.exist(err);
      var next = function() {
        h.driver.elementByName('Animation', function(err) {
          should.exist(err);
          [13, 6].should.include(err.status);
          done();
        });
      };
      setTimeout(next, 4000);
    });
  });
  it('should not fail even when bad locator strats sent in', function(done) {
    h.driver.elementByLinkText("foobar", function(err) {
      should.exist(err);
      err.status.should.equal(13);
      err.cause.value.origValue.should.eql("Strategy link text is not valid.");
      h.driver.elementByName("Animation", function(err, el) {
        should.not.exist(err);
        should.exist(el);
        done();
      });
    });
  });
});

describeBad('bad app path', function(h) {
  it('should throw an error', function(done) {
    should.exist(h.connError);
    var err = JSON.parse(h.connError.data);
    err.value.origValue.should.include("Could not sign one or more apks");
    done();
  });
}, null, null, null, {expectConnError: true});
