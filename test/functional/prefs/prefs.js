"use strict";

var setup = require("../common/setup-base")
  , checkPreferencesApp = require("../../../lib/helpers").checkPreferencesApp
  , chai = require('chai')
  , should = chai.should()
  , appPath = '/tmp/Appium-Preferences.app';

describe('settings app', function() {
  it('should copy app correctly', function(done) {
    checkPreferencesApp('6.1', function(err, actualAppPath) {
      should.not.exist(err);
      appPath.should.eql(actualAppPath);
      done();
    });
  });
});

describe('settings app', function() {
  var browser;
  setup(this, {app: appPath})
    .then( function(_browser) { browser = _browser; } );

  it('should turn off autocomplete', function(done) {
    var p = {strategy: "tag name", selector: "tableCell", index: 1};
    var switchEl;
    browser
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

var checkLocServ = function(browser, expected, cb) {
  browser
    .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 2}])
    .sleep(1000)
    .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 0}])
    .elementByTagName('switch')
    .getValue().then(function(checked) {
      checked.should.eql(expected);
    }).nodeify(cb);
};

describe('settings app with location services', function() {
  var browser;
  setup(this, {app: appPath, locationServicesEnabled: true})
    .then( function(_browser) { browser = _browser; } );

  it('should respond to positive locationServicesEnabled cap', function(done) {
    checkLocServ(browser, 1, done);
  });
});

describe('settings app without location services', function() {
  var browser;
  setup(this, {app: appPath, locationServicesEnabled: false})
    .then( function(_browser) { browser = _browser; } );

  it('should respond to negative locationServicesEnabled cap', function(done) {
    checkLocServ(browser, 0, done);
  });
});
