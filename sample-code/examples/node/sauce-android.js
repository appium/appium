/*global it:true */

/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION
   First: npm install mocha -g; npm install wd
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha sauce-android.js */

"use strict";

var should = require("should")
  , appUrl = 'http://appium.s3.amazonaws.com/NotesList.apk'
  , dbPath = "../../../test/helpers/driverblock.js"
  , describeSauce = require(dbPath).describeForSauce(appUrl, 'Android')
  , extraCaps = {
      name: "Appium Test on Sauce"
      , "app-activity": ".NotesList"
      , "app-package": "com.example.android.notepad"
    };

describeSauce('notes app', function(h) {
  it('should save a note', function(done) {
    h.driver.elementByName("New note", function(err, el) {
      el.click(function() {
        h.driver.elementByTagName("textfield", function(err, el) {
          el.sendKeys("This is a new note!", function() {
            h.driver.elementByName("Save", function(err, el) {
              el.click(function() {
                h.driver.elementsByTagName("text", function(err, els) {
                  els[2].text(function(err, text) {
                    text.should.equal("This is a new note!");
                    els[2].click(function() {
                      h.driver.quit(done);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}, extraCaps);
