/*global describe:true */
"use strict";

var checkPreferencesApp = require("../../../lib/helpers").checkPreferencesApp
  , should = require('should')
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
    h.driver.execute("mobile: findAndAct", [p], function(err) {
      should.not.exist(err);
      setTimeout(function() {
        h.driver.execute("mobile: findAndAct", [p], function(err) {
          should.not.exist(err);
          h.driver.elementByXPath('//switch[@name="Auto-Correction"]', function(err, switchEl) {
            switchEl.getValue(function(err, checked) {
              if (checked === 1) {
                // was checked, click it off
                switchEl.click(function(err) {
                  should.not.exist(err);
                  done();
                });
              } else {
                // was unchecked, do nothing
                done();
              }
            });
          });
        });
      }, 1000);
    });
  });
});
