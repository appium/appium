/* jshint esnext: true */
"use strict";

/*
First you need to install node > 0.11 to run this. 
(You may use this https://github.com/visionmedia/n for easy install/switch 
between node versions)

Then run:
  node --harmony local-android-yiewd-contacts.js
*/

var wd = require("yiewd"),
    o_O = require('monocle-js').o_O,
    path = require('path');
require('colors');

var desired = {
  'appium-version': '1.0',
  platformName: 'Android',
  platformVersion: '4.3',
  deviceName: 'Android Emulator',
  "app": path.resolve(__dirname, '../..', 'apps/ContactManager/ContactManager.apk'),
  "appPackage": "com.android.contacts", // built-in contact app
  "appActivity": "activities.PeopleActivity"
};

// Default is for very slow ARM emulator
var TIME_BASE_UNIT = parseInt(process.env.TIME_BASE_UNIT || 5000);

var bc = function(t) { return "//android.widget.Button[contains(@text, '" + t + "')]"; };
var ec = "//android.widget.EditText";
var tc = function(t) { return "//android.widget.TextView[contains(@text, '" + t + "')]"; };

var driver = wd.remote('localhost', 4723);
// See whats going on
driver.on('status', function(info) {
  console.log(info.cyan);
});
driver.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

var deleteUser =  function(name, timeout) {
  return o_O(function*() {
    yield driver.waitForElementByXPath(tc(name), timeout).click();
    yield driver.elementByName('More options').click();
    yield driver.waitForElementByXPath(tc('Delete')).click();
    yield driver.elementByXPath(bc('OK'), TIME_BASE_UNIT).click();
  })();
};

// Run the testå
driver.run(function*() {
  try {
    yield this.init(desired);
    // TODO: this sleep should not be necessary
    yield this.sleep(3000);
    // waiting for app initialization
    yield this.waitForElementByXPath(tc('Contact Manager'), 10*TIME_BASE_UNIT);

    //try to delete contact if it is there
    try{
      yield deleteUser('John Smith', TIME_BASE_UNIT/10);
    } catch(ignore) {}

    yield this.waitForElementByXPath(bc('Add Contact'), 2*TIME_BASE_UNIT).click();

    // There may be a confirmation stage
    try {
      yield this.waitForElementByXPath(bc('Keep'), TIME_BASE_UNIT).click();
    } catch(ignore) {}

    // Adding user
    yield this.waitForElementByXPath(ec, 2*TIME_BASE_UNIT);
    var ecs = yield this.elementsByXPath(ec);
    yield ecs[0].sendKeys("John Smith");
    yield ecs[1].sendKeys("(555) 555-5555");
    yield ecs[2].sendKeys("john.smith@google.io");
    yield this.elementByXPath(bc('Save')).click();

    // TODO: The contact manager is crashing right here.
      
    // // Editing user
    // yield this.waitForElementByName("Edit", TIME_BASE_UNIT*10); // superslow
    // yield this.elementByName("Edit").click();
    // yield this.waitForElementByXPath(bc('Add another field'), 2*TIME_BASE_UNIT).click();
    // yield this.waitForElementByXPath(tc('Address'), 2*TIME_BASE_UNIT).click();
    // yield this.waitForElementByXPath(ec('Address'), 2*TIME_BASE_UNIT).sendKeys("123 Appium Street");
    // yield this.elementByXPath(tc('Done')).click();

    // // Deleting user
    // yield deleteUser('John Smith', 2*TIME_BASE_UNIT);
  } catch(e) {
    console.log(e);
  }
  yield this.sleep(Math.ceil(TIME_BASE_UNIT/1000)); // yiewd sleep takes seconds
  yield this.quit();
});
