"use strict";

var setup = require("../common/setup-base"),
    desired = require('./desired');

describe('testapp - accented characters', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should send accented text', function (done) {
    driver
      .elementsByTagName('textField').then(function (elems) {
        return elems[1];
      }).then(function (elem) {
        elem.sendKeys("é Œ ù ḍ");
        elem.text().should.become("é Œ ù ḍ");
      }).nodeify(done);
  });
});
