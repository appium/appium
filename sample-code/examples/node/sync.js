var wdSync = require("wd-sync")
  , assert = require("assert")
  , username = "<username>" //omit for local
  , accessKey = "<accessKey>" // Omit for local
  , appURL = "http://appium.s3.amazonaws.com/TestApp6.0.app.zip";

// Instantiate a remote wd instance
var client = wdSync.remote(
  "ondemand.saucelabs.com" //Omit for local test run
  , 80, username, accessKey //Omit for local test run
)
, browser = client.browser
, sync = client.sync;

// Define the environment
var desired = {
  device: 'iPhone Simulator'
  , name: "Appium: Sync WD"
  , platform:'Mac 10.8'
  , app: appURL
  , version: '6.1'
  , browserName: ''
};

// Print useful output
browser.on('status', function(info) {
  console.log('\x1b[36m%s\x1b[0m', info);
});

browser.on('command', function(meth, path, data) {
  console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path, data || '');
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
  assert.equal(browser.text(texts[0]), 5);

  // quite the browser
  browser.quit();
});
