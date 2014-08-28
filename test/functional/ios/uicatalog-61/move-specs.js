"use strict";

var setup = require("../../common/setup-base"),
    desired = require('./desired');

describe('uicatalog - move @skip-ios7up', function () {

  describe('moveTo and click', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should be able to click on arbitrary x-y elements', function (done) {
      driver
        .elementByClassName('UIATableCell').moveTo(10, 10).click()
        .elementByXPath("//UIAButton[@name='Rounded']")
          .should.eventually.exist
        .nodeify(done);
    });
  });
});
