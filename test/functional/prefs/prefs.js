"use strict";

var chai = require('chai')
  , describeWd = require("../../helpers/driverblock.js").describeForSettings
  , env = {} // anticipate @sebv changes
  , it = require("../../helpers/driverblock.js").it;

env.DEVICE = process.env.DEVICE || "IOS6"; // anticipate @sebv changes

chai.should();

describeWd('settings app', function(h) {
  it('should turn off autocomplete', function(done) {
    var ios7 = env.DEVICE.indexOf("7") !== -1;
    var clickGeneral = {strategy: "tag name", selector: "tableCell", index: ios7 ? 0 : 1};
    var clickKeyboard = {strategy: "tag name", selector: "tableCell", index: ios7 ? 3 : 1};
    var switchEl;
    h.driver
      .execute("mobile: findAndAct", [clickGeneral])
      .sleep(1000)
      .execute("mobile: findAndAct", [clickKeyboard])
      .elementByXPath('//switch[@name="Auto-Correction"]')
      .then(function(el) { switchEl = el; return el; })
      .getValue().then(function(checked) {
        if (checked === 1) return switchEl.click();
      }).nodeify(done);
  });
});

var checkLocServ = function(h, expected, cb) {
  h.driver
    .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 2}])
    .sleep(1000)
    .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 0}])
    .elementByTagName('switch')
    .getValue().then(function(checked) {
      checked.should.eql(expected);
    }).nodeify(cb);
};

describeWd('settings app with location services', function(h) {
  it('should respond to positive locationServicesEnabled cap', function(done) {
    checkLocServ(h, 1, done);
  });
}, null, null, {locationServicesEnabled: true});

describeWd('settings app without location services', function(h) {
  it('should respond to negative locationServicesEnabled cap', function(done) {
    checkLocServ(h, 0, done);
  });
}, null, null, {locationServicesEnabled: false});
