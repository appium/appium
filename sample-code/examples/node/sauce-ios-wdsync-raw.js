// FIRST: npm install wd-sync

// WD.js driver
var wdSync = require("wd-sync");

// Test libraries
require('colors');
var chai = require("chai");
chai.should();

// Appium server info
var host = process.env.APPIUM_HOST || "ondemand.saucelabs.com",
    port = parseInt(process.env.APPIUM_PORT || 80),
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Browser/app config
var appUrl = 'http://appium.s3.amazonaws.com/TestApp6.0.app.zip';
var desired={
  browserName: '',
  version: '6.1',
  app: appUrl,
  device: 'iPhone Simulator',
  name: "Appium: with WD Mocha", 
  'device-orientation': 'portrait',
  platform: "Mac"
};

// Instantiate a remote wd instance
var client = wdSync.remote(host, port, username, accessKey),
  browser = client.browser,
  sync = client.sync;

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

// Run the testage
sync(function() {

  // Init the browser
  browser.init(desired);

  // Type into two fields
  var fields = browser.elementsByTagName('textField');
  fields[0].type('2');
  fields[1].type('3');

  // Click a button
  var buttons = browser.elementsByTagName('button');
  buttons[0].click();

  // Verify results
  var texts = browser.elementsByTagName('staticText');
  browser.text(texts[0]).should.equal("5");

  // quite the browser
  browser.quit();
});
