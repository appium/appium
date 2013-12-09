/*global it:true, describe:true, beforeEach:true, afterEach:true */

/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION
   First: npm install mocha -g; npm install wd
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha -t 300000 sauce-android.js */

"use strict";

var should = require("should")
  , wd = require("wd")
  , appUrl = 'http://appium.s3.amazonaws.com/NotesList.apk';

describe('notes app', function() {
  var driver = null;

  beforeEach(function(done) {
    driver = wd.remote("ondemand.saucelabs.com", 80,
      process.env.SAUCE_USERNAME, process.env.SAUCE_ACCESS_KEY);
    driver.init({
      device: 'Android',
      version: '4.2',
      app: appUrl,
      name: 'Sauce Android test',
      'app-activity': '.NotesList',
      'app-package': 'com.example.android.notepad'
    }, function(err) {
      should.not.exist(err);
      done();
    });
  });

  afterEach(function(done) {
    driver.quit(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('should save a note', function(done) {
    driver.elementByName("New note", function(err, el) {
      el.click(function() {
        driver.elementByTagName("textfield", function(err, el) {
          el.sendKeys("This is a new note!", function() {
            driver.elementByName("Save", function(err, el) {
              el.click(function() {
                driver.elementsByTagName("text", function(err, els) {
                  els[2].text(function(err, text) {
                    text.should.equal("This is a new note!");
                    els[2].click(function(err) {
                      should.not.exist(err);
                      done();
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
});
