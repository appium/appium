"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

// TODO: check why this doesn't work 
describe('testapp - accented characters @skip-ios-all', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should send accented text', function (done) {
    driver
      .elementsByTagName('textField').at(1)
        .sendKeys("é Œ ù ḍ")
        .text()
        .should.become("é Œ ù ḍ")
      .nodeify(done);
  });
});
