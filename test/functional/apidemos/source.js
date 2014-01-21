"use strict";

var setup = require("../common/setup-base")
  , desired = require("./desired");

describe('get source', function() {
  var browser;
  setup(this, desired)
   .then( function(_browser) { browser = _browser; } );

  it('should return the page source', function(done) {
    browser
      .elementByNameOrNull('Accessibility') // waiting for page to load
      .source().then(function(source) {
        var obj = JSON.parse(source);
        obj.should.exist;
        obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      }).nodeify(done);
  });
  it('should return the page source without crashing other commands', function(done) {
    browser
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
