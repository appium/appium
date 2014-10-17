"use strict";

var env = require("../../../helpers/env")
  , setup = require("../../common/setup-base")
  , chai = require('chai')
  , _ = require("underscore");

chai.should();

var desired = {
  app: 'settings'
};

describe("prefs @skip-ios6", function () {
  // TODO: cannot install settings app on ios6
  describe('settings app', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should turn off autocomplete', function (done) {
      var ios7up = _.contains(["ios7", "ios71", "ios8", "ios81"], env.DEVICE);
      var ios8 = _.contains(["ios8", "ios81"], env.DEVICE);
      var switchEl;
      driver
        .elementsByClassName("UIATableCell").at(ios7up ? 0 : 1).click()
        .sleep(1000)
        .elementsByClassName("UIATableCell").at(ios7up ? (ios8 ? 2 : 3) : 1)
          .click()
        .elementByXPath('//UIASwitch[@name="Auto-Correction"]')
        .then(function (el) { switchEl = el; return el; })
        .getValue().then(function (checked) {
          if (checked === 1) return switchEl.click();
        }).nodeify(done);
    });
  });

});

