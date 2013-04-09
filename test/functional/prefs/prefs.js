/*global it:true, before:true, describe:true, beforeEach:true */
"use strict";

var checkPreferencesApp = require("../../../app/helpers").checkPreferencesApp
  , should = require('should')
  , describeWd;

describe('preferences app', function() {
  beforeEach(function(done) {
    checkPreferencesApp('6.1', function(err, appPath) {
      should.not.exist(err);
      describeWd = require("../../helpers/driverblock.js").describeForApp(appPath);
      done();
    });
  });

  it('', function() {
    describeWd('settings', function(h) {
      // example of a script that turns of auto-complete
      // if you run it on a server with --no-reset, it will keep this state
      // for subsequent app runs. Note that for this to work you'll need to
      // have modified the plist of your preferences.app to run iphone
      // instead of ipad by default (this test is for iphone)
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
  });
});
