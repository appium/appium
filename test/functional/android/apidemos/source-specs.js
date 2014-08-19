"use strict";

var setup = require("../../common/setup-base")
  , xpath = require("xpath")
  , XMLDom = require("xmldom").DOMParser
  , desired = require("./desired");

describe("apidemos - source", function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var assertSource = function (source) {
    source.should.exist;
    var dom = new XMLDom().parseFromString(source);
    var nodes = xpath.select('//android.widget.TextView[@content-desc="App"]', dom);
    nodes.length.should.equal(1);
  };

  it('should return the page source', function (done) {
    driver
      .elementByAccessibilityId('Animation') // waiting for page to load
      .source()
      .then(function (source) {
        assertSource(source);
      }).nodeify(done);
  });
  it('should return the page source without crashing other commands', function (done) {
    driver
      .elementByAccessibilityId('Animation')
      .source().then(function (source) {
        assertSource(source);
      })
      .elementByAccessibilityId('Animation')
      .nodeify(done);
  });
});
