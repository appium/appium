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
      .elementsByTagName('textField').at(1)
        .sendKeys(testText)
        .text()
        .should.become(testText)
      .nodeify(done);
  });

  it('should send delete key', function (done) {
    driver
      .elementsByTagName('textField').at(1)
        .sendKeys("abc")
        .sendKeys('\uE003')
        .text()
        .should.become("")
      .nodeify(done);
  });
});
