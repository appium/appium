/*global describe:true */
"use strict";

var checkPreferencesApp = require("../../../lib/helpers").checkPreferencesApp
  , chai = require('chai')
  , should = chai.should()
  , appPath = '/tmp/Appium-Preferences.app'
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath)
  , it = require("../../helpers/driverblock.js").it;

describe('settings app', function() {
  it('should copy app correctly', function(done) {
    checkPreferencesApp('6.1', function(err, actualAppPath) {
      should.not.exist(err);
      appPath.should.eql(actualAppPath);
      done();
    });
  });
});

describeWd('settings app', function(h) {
  it('should turn off autocomplete', function(done) {
    var p = {strategy: "tag name", selector: "tableCell", index: 1};
    var switchEl;
    h.driver
      .execute("mobile: findAndAct", [p])
      .sleep(1000)
      .execute("mobile: findAndAct", [p])
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
