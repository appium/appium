"use strict";

// todo: figure out how to install chrome

// WD.js driver
var wd = require("wd");

// Test libraries
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

// Enable chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Browser/app config
var desired = {
    device: 'Android',
    //platform: "Mac",
    //version: "4.3",
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


// Run the test
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
      .fin(function() { return browser.quit(); });
  })
  .catch(function(err) {console.log(err);})
  .done();
