/*global it:true, describe:true, beforeEach:true, afterEach:true */

"use strict";

/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION
   First: npm install mocha -g; npm install wd
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha -R spec sauce-android-mocha-wd-notepad.js */

// WD.js driver
var wd = require("wd");
var Q = wd.Q;

// Test libraries
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

// Enable chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Appium server info
var host = process.env.APPIUM_HOST || "ondemand.saucelabs.com",
    port = parseInt(process.env.APPIUM_PORT || 80),
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Big timeout is needed
var timeout = process.env.TIMEOUT || 300000;

// Browser/app config
var appUrl = 'http://appium.s3.amazonaws.com/NotesList.apk';
var desired = {
  device: 'Android',
  platform: 'Linux',
  version: '4.2',
  app: appUrl,
  name: 'Sauce Android test',
  'app-activity': '.NotesList',
  'app-package': 'com.example.android.notepad'
};

describe('notes app', function() {
  this.timeout(timeout);
  var browser = null;

  beforeEach(function(done) {
    browser =  wd.promiseChainRemote(host, port, username, accessKey);
    // See whats going on
    browser.on('status', function(info) {
      console.log(info.cyan);
    });
    browser.on('command', function(meth, path, data) {
      console.log(' > ' + meth.yellow, path.grey, data || '');
    });

    browser
      .init(desired)
      .nodeify(done);
  });

  afterEach(function(done) {
    browser
      .quit()
      .nodeify(done);
  });

  it('should save a note', function(done) {
    browser
      .elementByName("New note")
        .click()
      .elementByTagName("textfield")
        .sendKeys("This is a new note!")
      .elementByName("Save")
        .click()
      .elementsByTagName("text")
        .then(function(els) {
          return Q.all([
            els[2].text().should.become("This is a new note!"),
            els[2].click()
          ])
      .nodeify(done);
    });
  });
});
