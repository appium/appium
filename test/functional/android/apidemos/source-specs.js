"use strict";

var setup = require("../../common/setup-base")
  , xpath = require("xpath")
  , XMLDom = require("xmldom").DOMParser
  , desired = require("./desired");

describe("apidemos - source -", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return the page source', function (done) {
    driver
      .elementByNameOrNull('Accessibility') // waiting for page to load
      .source().then(function (source) {
        source.should.exist;
        source.should.include('android.widget.FrameLayout');
        source.should.include('@class');
        var obj = JSON.parse(source);
        obj.should.exist;
        // probably no need for so precise tests
        //obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        //obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      }).nodeify(done);
  });
  it('should return the page source as xml', function (done) {
    driver
      .elementByNameOrNull('Accessibility') // waiting for page to load
      .execute("mobile: source", [{type: 'xml'}]).then(function (source) {
        source.should.exist;
        var dom = new XMLDom().parseFromString(source);
        var nodes = xpath.select('//node[@content-desc="App"]', dom);
        nodes.length.should.equal(1);
      }).nodeify(done);
  });
  it('should return the page source without crashing other commands', function (done) {
    driver
      .execute("mobile: find", [[[[3, "Animation"]]]])
      .source().then(function (source) {
        source.should.exist;
        source.should.include('android.widget.FrameLayout');
        source.should.include('@class');
        var obj = JSON.parse(source);
        obj.should.exist;
        // probably no need for so precise tests
        //obj.hierarchy.node['@class'].should.equal("android.widget.FrameLayout");
        //obj.hierarchy.node.node.node[0].node['@class'].should.equal("android.widget.FrameLayout");
      }).execute("mobile: find", [[[[3, "Animation"]]]])
      .nodeify(done);
  });
});
