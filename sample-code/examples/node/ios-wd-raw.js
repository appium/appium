"use strict";

/*
pass SAUCE=1 to run on sauce
*/

var wd = require("wd");

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var host, port, username, accessKey, desired;

if(process.env.SAUCE) {
  host = "ondemand.saucelabs.com";
  port = 80;
  username = process.env.SAUCE_USERNAME;
  accessKey = process.env.SAUCE_ACCESS_KEY;

  desired={
    browserName: '',
    version: '6.1',
    app: "http://appium.s3.amazonaws.com/TestApp6.0.app.zip",
    device: 'iPhone Simulator',
    name: "Appium: with WD Mocha",
    'device-orientation': 'portrait',
    platform: "Mac"
  };

} else {
  // local
  host = "localhost";
  port = 4723;

  // Browser/app config
  desired={
    device: 'iPhone Simulator',
    name: "Appium: with WD",
    platform: "Mac",
    app: "http://appium.s3.amazonaws.com/TestApp6.0.app.zip",
    // version: "6.0",
    browserName: "",
    newCommandTimeout: 60
  };
}

// Instantiate a new browser session
var browser = wd.promiseChainRemote(host , port, username, accessKey);

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

// Run the test
browser
  .init(desired)
  .then(function() {
    browser
      .elementsByTagName("textField").then(function(els) {
        return els[0].type('2').then(function() {
          return els[1].type('3');
        });
      })
      .elementByTagName('button')
        .click()
      .elementByTagName('staticText')
        .text().should.become("5")
      .fin(function() {
        return browser
          .sleep(3000)
          .quit();
      });
  })
  .catch(function(err) {
    console.log(err);
    throw err;
  })
  .done();
