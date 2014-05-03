"use strict";

/*
LOCAL APPIUM:
  node ios-wd-raw.js

APPIUM ON SAUCE LABS:
  1/ Set your sauce credentials (SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables)
  2/ SAUCE=1 node ios-wd-raw.js 
*/

var wd = require("wd");

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var host, port, username, accessKey, desired;

var desired = {
    'appium-version': '1.0',
    platformName: 'iOS',
    platformVersion: '7.1',
    deviceName: 'iPhone Simulator',
    app: "http://appium.s3.amazonaws.com/TestApp6.0.app.zip",
    'device-orientation': 'portrait',
  };

if (process.env.SAUCE) {
  // Sauce Labs config
  host = "ondemand.saucelabs.com";
  port = 80;
  username = process.env.SAUCE_USERNAME;
  accessKey = process.env.SAUCE_ACCESS_KEY;
  desired.name = "Appium: with WD Mocha";
} else {
  // local config
  host = "localhost";
  port = 4723;
}

// Instantiate a new browser session
var browser = wd.promiseChainRemote(host, port, username, accessKey);

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
      .elementsByIosUIAutomation('.textFields();').then(function (els) {
        return els[0].type('2').then(function () {
          return els[1].type('3');
        });
      })
      .elementByIosUIAutomation('.buttons()')
        .click()
      // .elementByTagName('staticText')
      //   .text().should.become("5")
      .catch(function(err) { console.log(err); })
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
