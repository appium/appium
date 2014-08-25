"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired'),
    unorm = require('unorm');

describe('testapp - accented characters', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should send accented text', function (done) {
    var testText = unorm.nfd("é Œ ù ḍ");
    driver
      .elementsByClassName('UIATextField').at(1)
        .sendKeys(testText)
        .text()
        .should.become(testText)
      .nodeify(done);
  });

  it('should send delete key', function (done) {
    driver
      .elementsByClassName('UIATextField').at(1)
        .clear()
        .sendKeys("abc")
        .sendKeys('\uE003\uE003\uE003')
        .text()
        .should.become("")
      .nodeify(done);
  });
});
