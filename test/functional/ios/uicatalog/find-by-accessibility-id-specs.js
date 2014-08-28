"use strict";

var setup = require("../../common/setup-base")
  , env = require('../../../helpers/env.js')
  , desired = require('./desired');

describe('uicatalog - find by accessibility id @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  afterEach(function (done) {
    driver.clickButton('UICatalog')
    .nodeify(done);
  });

  it('should find an element by name beneath another element', function (done) {
    var axIdExt = env.IOS8 ? '' : ', AAPLActionSheetViewController';
    driver
      .elementByAccessibilityId("UICatalog").click()
      .elementByAccessibilityId("Action Sheets" + axIdExt)
        .nodeify(done);
  });
});
