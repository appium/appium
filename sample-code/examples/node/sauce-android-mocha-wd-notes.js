/*global it:true, describe:true, before:true, after:true */

"use strict";

/* 
  1/ Set your sauce credentials (SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables)
  2/ npm install mocha -g;
  3/ Run: 
    mocha -R spec sauce-android-mocha-wd-notes.js 
*/

var wd = require("wd"),
    Q = wd.Q;

require('colors');
var chai = require("chai"),
    chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var host = "ondemand.saucelabs.com",
    port = 80,
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Big timeout is needed
var timeout = process.env.TIMEOUT || 300000;

var desired = {
  'appium-version': '1.0',
  platformName: 'Android',
  platformVersion: '4.3',
  deviceName: 'Android Emulator',
  app: 'http://appium.s3.amazonaws.com/NotesList.apk',
  name: 'Sauce Android test',
  'app-activity': '.NotesList',
  'app-package': 'com.example.android.notepad'
};

describe('notes app', function() {
  this.timeout(timeout);
  var browser = null;

  before(function(done) {
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

  after(function(done) {
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
