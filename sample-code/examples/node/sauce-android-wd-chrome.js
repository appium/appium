// todo: Right know we get "Failed to download app: chrome"

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

// Appium server info
var host = process.env.APPIUM_HOST || "ondemand.saucelabs.com",
    port = parseInt(process.env.APPIUM_PORT || 80),
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Browser/app config
var appURL = "http://appium.s3.amazonaws.com/WebViewApp6.0.app.zip";
var desired = {
  device: 'Android',
  platform: 'Linux',
  //version: '4.2',
  app: "chrome",
  browserName: '',
};

// Instantiate a new browser session
var browser = wd.promiseChainRemote(host, port, username, accessKey);

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
  .get("http://saucelabs.com/test/guinea-pig")
  .elementById('i_am_an_id')
    .text().should.become("I am a div")
  .elementById('comments')
    .sendKeys("This is an awesome comment")
  .elementById('submit')
    .click()
  .waitForElementById('your_comments', 
    wd.asserters.textInclude("This is an awesome comment"))
  .fin(function() { return browser.quit(); })
  .done();
