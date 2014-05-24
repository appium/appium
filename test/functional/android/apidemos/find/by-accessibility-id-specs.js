"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired");

describe("apidemo - find - by accessibility id", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find an element by name', function (done) {
    driver.element('accessibility id', 'Animation').then(function (el) {
      el.should.exist;
    }).nodeify(done);
  });
  it('should return an array of one element if the plural "elements" is used', function (done) {
    driver.elements('accessibility id', 'Animation').then(function (els) {
      els.length.should.equal(1);
    }).nodeify(done);
  });
});
