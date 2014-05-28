"use strict";

/*
  run:
    node local-ios-wd-safari.js
*/

var wd = require("wd");

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var desired = {
  'appium-version': '1.0',
  platformName: 'iOS',
  platformVersion: '7.1',
  deviceName: 'iPhone Simulator',
  browserName: "safari",
  name: "Appium Safari: with WD",
  newCommandTimeout: 60
};

var browser = wd.promiseChainRemote("localhost", 4723);

// See whats going on
browser.on('status', function (info) {
  console.log(info.cyan);
});
browser.on('command', function (meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

// Run the test
browser
  .init(desired)
  .then(function () {
    browser
      .get("http://saucelabs.com/test/guinea-pig")
      .waitForElementById('i_am_an_id', 5000)
        .text().should.become("I am a div")
      .elementById('comments')
        .sendKeys("This is an awesome comment")
      .elementById('submit')
        .click()
      .waitForElementById('your_comments',
        wd.asserters.textInclude("This is an awesome comment"))
      .fin(function () {
        return browser
        .sleep(3000)
        .quit();
      });
  })
  .catch(function (err) {
    console.log(err);
    throw err;
  })
  .done();
