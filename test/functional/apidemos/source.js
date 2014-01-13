"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , it = require("../../helpers/driverblock.js").it;

describeWd('get source', function(h) {
  it('should return the page source', function(done) {
    h.driver
      .elementByNameOrNull('Accessibility') // waiting for page to load
      .source().then(function(source) {
        var obj = JSON.parse(source);
        obj.should.exist;
        obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      }).nodeify(done);
  });
  it('should return the page source without crashing other commands', function(done) {
    h.driver
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .source().then(function(source) {
        var obj = JSON.parse(source);
        obj.should.exist;
        obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        //obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      }).execute("mobile: find", [[[[3, "Animation"]]]])
      .nodeify(done);
  });
});
