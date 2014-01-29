"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('testapp - size -', function () {

  describe('element size', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should return the right element size', function (done) {
      driver.elementByTagName('button').getSize().then(function (size) {
        size.width.should.eql(113);
        size.height.should.eql(37);
      }).nodeify(done);
    });

    it('should return the window size', function (done) {
      driver.getWindowSize().then(function (size) {
        size.width.should.be.above(319);
        size.height.should.be.above(479);
      }).nodeify(done);
    });
  });
});
