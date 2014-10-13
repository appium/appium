"use strict";

var setup = require("../../common/setup-base")
  , xpath = require("xpath")
  , XMLDom = require("xmldom").DOMParser
  , ChaiAsserter = require("../../../helpers/asserter").ChaiAsserter
  , desired = require('./desired');

var sourceIsRight = function (driver) {
  return new ChaiAsserter(function () {
    return driver.source().then(function (source) {
      var dom = new XMLDom().parseFromString(source);
      var nodes = xpath.select('//UIAButton', dom);
      nodes.length.should.equal(7);
    });
  });
};

describe('testapp - source', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should return page source', function (done) {
    driver
      .waitFor(sourceIsRight(driver), 3000)
      .nodeify(done);
  });
});
