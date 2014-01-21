"use strict";

var env = require("../../helpers/env")
  , appUtils = require('../../helpers/app-utils')
  , setup = require("../common/setup-base")
  , chai = require('chai')
  , _ = require('underscore');

chai.should();

var desired = {
    app: 'settings'
    , device: 'iPhone Simulator'
};

describe("prefs @skip-ios6", function() {

  describe('settings app', function() {
    var driver;
    setup(this, desired).then( function(d) { driver = d; } );

    it('should turn off autocomplete', function(done) {
      var ios7 = env.DEVICE.indexOf("7") !== -1;
      var clickGeneral = {strategy: "tag name", selector: "tableCell", index: ios7 ? 0 : 1};
      var clickKeyboard = {strategy: "tag name", selector: "tableCell", index: ios7 ? 3 : 1};
      var switchEl;
      driver
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

  var checkLocServ = function(driver, expected, cb) {
    driver
      .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 2}])
      .sleep(1000)
      .execute("mobile: findAndAct", [{strategy: "tag name", selector: "tableCell", index: 0}])
      .elementByTagName('switch')
      .getValue().then(function(checked) {
        checked.should.eql(expected);
      }).nodeify(cb);
  };

  describe('settings app with location services', function() {
    var driver;
    setup(this, _.defaults({locationServicesEnabled: true}, desired))
      .then( function(d) { driver = d; } );

    it('should respond to positive locationServicesEnabled cap', function(done) {
      checkLocServ(driver, 1, done);
    });
  });

  describe('settings app without location services', function() {
    var driver;
    setup(this, _.defaults({locationServicesEnabled: false}, desired))
      .then( function(d) { driver = d; } );

    it('should respond to negative locationServicesEnabled cap', function(done) {
      checkLocServ(driver, 0, done);
    });
  });
});
