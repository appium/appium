"use strict";

var env = require("../../../helpers/env")
  , setup = require("../../common/setup-base")
  , chai = require('chai');

chai.should();

var desired = {
  app: 'settings'
};

describe("prefs @skip-ios6 @skip-real-device", function () {
  // TODO: cannot install settings app on ios6
  describe('settings app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should turn off autocomplete', function (done) {
      var ios7up = env.IOS7 || env.IOS8 || env.IOS9;
      var switchEl;
      driver
        .elementsByClassName("UIATableCell").at(ios7up ? 0 : 1).click()
        .sleep(1000)
        .elementsByClassName("UIATableCell").at(ios7up ? (env.IOS8 ? 2 : 3) : 1)
          .click()
        .elementByXPath('//UIASwitch[@name="Auto-Correction"]')
        .then(function (el) { switchEl = el; return el; })
        .getValue().then(function (checked) {
          if (checked === 1) return switchEl.click();
        }).nodeify(done);
    });
  });

});
