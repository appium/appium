"use strict";

var setup = require("../../common/setup-base")
  , xpath = require("xpath")
  , XMLDom = require("xmldom").DOMParser
  , desired = require('./desired');

describe('testapp - source -', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return the page source as json', function (done) {
    driver.source().then(function (source) {
      var obj = JSON.parse(source);
      obj.should.exist;
      obj.type.should.equal("UIAApplication");
      obj.children[0].type.should.equal("UIAWindow");
      obj.children[0].children[2].name.should.equal("ComputeSumButton");
      obj.children[0].children[3].rect.origin.x.should.equal(129);
      obj.children[0].children[4].visible.should.be.ok;
    }).nodeify(done);
  });

  it('should return page source as xml', function (done) {
    driver.execute("mobile: source", [{type: "xml"}])
      .then(function (source) {
        var dom = new XMLDom().parseFromString(source);
        var nodes = xpath.select('//UIAButton', dom);
        nodes.length.should.equal(6);
      }).nodeify(done);
  });
});
