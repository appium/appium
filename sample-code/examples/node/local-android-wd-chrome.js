"use strict";

/*
You need to install Chrome first on your emulator (last tested against v30).
(Look for a apk and use 'adb install', or install from Google play. Try first
with an ARM emulator.) 

Then run:
  node local-android-wd-chrome.js
*/

var wd = require("wd");

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var desired = {
    device: 'Android',
    //platform: "Mac",
    version: "4.3", // Android version last tested against
    app: "chrome",
};

// Instantiate a new browser session
var browser = wd.promiseChainRemote("localhost" , 4723);

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});


// Run the tests
browser
  .init(desired).then(function() {
    browser
      .get("http://saucelabs.com/test/guinea-pig")
      .elementById('i_am_an_id')
        .text().should.become("I am a div")
      .elementById('comments')
        .sendKeys("This is an awesome comment")
      .elementById('submit')
        .click()
      .waitForElementById('your_comments',
        wd.asserters.textInclude("This is an awesome comment"))
      .text()
        .should.eventually.include('awesome')
      .fin(function() { return browser.quit(); });
  })
  .catch(function(err) {
    console.log(err);
    throw err;
  })
  .done();