/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should');

describeWd('get source', function(h) {
  it('should return the page source', function(done) {
    h.driver.source(function(err, source){
      var obj = JSON.parse(source);
      should.not.exist(err);
      should.ok(obj);
      obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
      obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      done();
    });
  });
  it('should return the page source without crashing other commands', function(done) {
    h.driver.execute("mobile: find", [[[[7, "Animation"]]]], function(err, el) {
      should.not.exist(err);
      h.driver.source(function(err, source){
        var obj = JSON.parse(source);
        should.not.exist(err);
        should.ok(obj);
        obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
        h.driver.execute("mobile: find", [[[[7, "Animation"]]]], function(err, el) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
});
