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
  it('should get less source when compression is enabled', function (done) {
    var getSourceWithoutCompression = function () {
      return driver.updateSettings({"ignoreUnimportantViews": false}).source();
    };
    var getSourceWithCompression    = function () {
      return driver.updateSettings({"ignoreUnimportantViews": true }).source();
    };

    var sourceWithoutCompression, sourceWithCompression;

    getSourceWithoutCompression()
    .then(function (els) {
      sourceWithoutCompression = els;
      return getSourceWithCompression();
    })
    .then(function (els) {
      sourceWithCompression = els;
    })
    .then(function () {
      return sourceWithoutCompression.length.should.be.greaterThan(sourceWithCompression.length);
    })
    .nodeify(done);
  });
});
