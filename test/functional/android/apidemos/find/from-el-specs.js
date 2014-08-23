"use strict";

var setup = require("../../../common/setup-base")
  , desired = require("../desired")
  , atv = 'android.widget.TextView'
  , alv = 'android.widget.ListView';

describe("apidemo - find - from element", function () {

  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should find a single element by tag name', function (done) {
    driver.elementByClassName(alv).then(function (el) {
      return el
        .elementByClassName(atv).text().should.become("Access'ibility");
    }).nodeify(done);
  });
  it('should find multiple elements by tag name', function (done) {
    driver.elementByClassName(alv).then(function (el) {
      return el
        .elementsByClassName(atv).should.eventually.have.length.at.least(10);
    }).nodeify(done);
  });
  it('should not find an element that doesnt exist', function (done) {
    driver.elementByClassName(alv).then(function (el) {
      return el
        .elementByClassName("blargimarg").should.be.rejectedWith(/status: 7/);
    }).nodeify(done);
  });
  it('should not find multiple elements that dont exist', function (done) {
    driver.elementByClassName(alv).then(function (el) {
      return el
        .elementsByClassName("blargimarg").should.eventually.have.length(0);
    }).nodeify(done);
  });
});
