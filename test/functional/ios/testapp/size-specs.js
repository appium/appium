"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('testapp - size', function () {

  describe('element size', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should return the right element size', function (done) {
      driver.elementByClassName('UIAButton').getSize().then(function (size) {
        size.width.should.be.above(112);
        size.height.should.be.above(36);
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
