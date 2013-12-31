/* jshint esnext: true */
"use strict";

/*
This is using the built-in contact app in Android 4.3

First you need to install node > 0.11 to run this. 
(You may use this https://github.com/visionmedia/n for easy install/switch 
between node versions)

Then run:
node --harmony local-android-yiewd-contacts.js
*/

var wd = require("yiewd"),
    o_O = require('monocle-js').o_O;
require('colors');

var desired = {
  device: 'Android',
  version: "4.3", // Android version last tested against
  "app-package": "com.android.contacts",
  "app-activity": "activities.PeopleActivity"
};

// Default is for very slow ARM emulator
var TIME_BASE_UNIT = parseInt(process.env.TIME_BASE_UNIT || 5000);

var bc = function(t) { return "//button[contains(@text, '" + t + "')]"; };
var ec = function(t) { return "//editText[contains(@text, '" + t + "')]"; };
var tc = function(t) { return "//text[contains(@text, '" + t + "')]"; };

var browser = wd.remote('localhost', 4723);
// See whats going on
browser.driver.on('status', function(info) {
  console.log(info.cyan);
});
browser.driver.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

var deleteUser =  function(name, timeout) {
  return o_O(function*() {
    yield browser.waitForElementByXPath(tc(name), timeout).click();
    yield browser.elementByName('More options').click();
    yield browser.waitForElementByXPath(tc('Delete')).click();
    yield browser.elementByXPath(bc('OK'), TIME_BASE_UNIT).click();
  })();
};

// Run the test
browser.run(function*() {
  try {
    yield this.init(desired);

    // waiting for app initialization
    yield this.waitForElementByXPath(tc('contacts'), 10*TIME_BASE_UNIT);

    //try to delete contact if it is there
    try{
      yield deleteUser('John Smith', TIME_BASE_UNIT/10);
    } catch(ignore) {}

    yield this.waitForElementByXPath(bc('Create'), 2*TIME_BASE_UNIT).click();

    // There may be a confirmation stage
    try {
      yield this.waitForElementByXPath(bc('Keep'), TIME_BASE_UNIT).click();
    } catch(ignore) {}

    // Adding user
    yield this.waitForElementByXPath(ec('Name'), 2*TIME_BASE_UNIT).sendKeys("John Smith");
    yield this.elementByXPath(ec('Phone')).sendKeys("(555) 555-5555");
    yield this.elementByXPath(ec('Email')).sendKeys("john.smith@google.io");
    yield this.elementByXPath(tc('Done')).click();
      
    // Editing user
    yield this.waitForElementByName("Edit", TIME_BASE_UNIT*10); // superslow
    yield this.elementByName("Edit").click();
    yield this.waitForElementByXPath(bc('Add another field'), 2*TIME_BASE_UNIT).click();
    yield this.waitForElementByXPath(tc('Address'), 2*TIME_BASE_UNIT).click();
    yield this.waitForElementByXPath(ec('Address'), 2*TIME_BASE_UNIT).sendKeys("123 Appium Street");
    yield this.elementByXPath(tc('Done')).click();

    // Deleting user
    yield deleteUser('John Smith', 2*TIME_BASE_UNIT);
  } catch(e) {
    console.log(e);
  }
  yield this.sleep(Math.ceil(TIME_BASE_UNIT/1000)); // yiewd sleep takes seconds
  yield this.quit();
});
