"use strict";

var setup = require("../../common/setup-base"),
    env = require("../../../helpers/env.js"),
    desired = require('./desired');

describe('uicatalog - move @skip-ios6', function () {

  describe('moveTo and click', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should be able to click on arbitrary x-y elements', function (done) {
      var axIdExt = env.IOS8 ? "" : ", AAPLButtonViewController";
      driver
        .elementByAccessibilityId("Buttons" + axIdExt).moveTo(10, 10).click()
        .elementByXPath("//UIAElement['SYSTEM (CONTACT ADD)']")
          .should.eventually.exist.should.eventually.exist
        .nodeify(done);
    });
  });
});
