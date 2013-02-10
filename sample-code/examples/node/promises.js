var wd = require("wd")
  , assert = require("assert")
  , username = "<username>" // Omit for local test run
  , accessKey = "<accessKey>" // Omit for local test run
  , appURL = "http://appium.s3.amazonaws.com/TestApp.app.zip";

var browser = wd.promiseRemote(
  "ondemand.saucelabs.com" // Omit for local test run
  , 80, username, accessKey // Omit for local test run
);

// Print what's going on to the console
browser.on('status', function(info) {
  console.log('\x1b[36m%s\x1b[0m', info);
});

browser.on('command', function(meth, path, data) {
  console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path, data || '');
});

var elems = null;

// Run the promises!
browser.init({
  device: 'iPhone Simulator'
  , name: "Appium: WD with promises"
  , platform:'Mac 10.8'
  , app: appURL
  , version: ''
  , browserName: ''
}).then(function () {
  return browser.elementsByTagName('textField');
}).then(function (els) {
  elems = els;
  return browser.type(els[0], '2');
}).then(function () {
  return browser.type(elems[1], '3');
}).then(function() {
  return browser.elementsByTagName('button');
}).then(function(buttons) {
  return browser.clickElement(buttons[0]);
}).then(function() {
  return browser.elementsByTagName('staticText');
}).then(function(texts) {
  return texts[0].text()
}).then(function(str) {
  assert.equal(str, 5);
}).fin(function () {
  browser.quit();
}).done();
