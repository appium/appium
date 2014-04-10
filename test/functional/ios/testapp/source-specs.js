"use strict";

var setup = require("../../common/setup-base")
  , xpath = require("xpath")
  , XMLDom = require("xmldom").DOMParser
  , desired = require('./desired');

describe('testapp - source -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return page source', function (done) {
    driver
      .source()
      .then(function (source) {
        var dom = new XMLDom().parseFromString(source);
        var nodes = xpath.select('//UIAButton', dom);
        nodes.length.should.equal(6);
      }).nodeify(done);
  });
});
