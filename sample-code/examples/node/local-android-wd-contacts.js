"use strict";

/*
This is using the built-in contact app in Android 4.3
*/

var wd = require("wd"),
    path = require("path");
require('colors');

// Browser/app config
var appURL = path.resolve(__dirname, '../../apps/ContactManager/ContactManager.apk');
console.log(appURL);
var desired = {
  device: 'Android',
  version: "4.3", // Android version last tested against
  "app-package": "com.android.contacts",
  "app-activity": "activities.PeopleActivity"
};

// Default is for very slow ARM emulator
var TIME_BASE_UNIT = parseInt(process.env.TIME_BASE_UNIT || 5000);

// Instantiate a new browser session
var browser = wd.promiseChainRemote("localhost" , 4723);

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

var bc = function(t) { return "//button[contains(@text, '" + t + "')]"; };
var ec = function(t) { return "//editText[contains(@text, '" + t + "')]"; };
var tc = function(t) { return "//text[contains(@text, '" + t + "')]"; };

function deleteUser(name, timeout) {
  return browser
    .waitForElementByXPath(tc(name), timeout).click()
    .elementByName('More options')
    .click()
    .elementByXPath(tc('Delete')).click()
    .waitForElementByXPath(bc('OK'), TIME_BASE_UNIT).click();
}

// Run the test
browser
  .init(desired).then(function() {
    return browser
      // waiting for app initialization
      .waitForElementByXPath(tc('contacts'), 10*TIME_BASE_UNIT)

      //try to delete contact if it is there
      .then(function() {
        return deleteUser('John Smith', TIME_BASE_UNIT/10)
          .catch(function() {/* ignore */});
      })

      .waitForElementByXPath(bc('Create'), 2*TIME_BASE_UNIT).click()

      // There may be a confirmation stage
      .then(function() {
        return browser
          .waitForElementByXPath(bc('Keep'), TIME_BASE_UNIT)
          .click()
          .catch(function() {/* ignore */});
      })

      // Adding user
      .waitForElementByXPath(ec('Name'), 2*TIME_BASE_UNIT)
        .sendKeys("John Smith")
      .elementByXPath(ec('Phone'))
        .sendKeys("(555) 555-5555")
      .elementByXPath(ec('Email'))
        .sendKeys("john.smith@google.io")
      .elementByXPath(tc('Done')).click()
      
      // Editing user
      .waitForElementByName("Edit", TIME_BASE_UNIT*10) // superslow
        .click()
      .waitForElementByXPath(bc('Add another field'), 2*TIME_BASE_UNIT)
      .click()
      .waitForElementByXPath(tc('Address'), 2*TIME_BASE_UNIT)
      .click()
      .waitForElementByXPath(ec('Address'), 2*TIME_BASE_UNIT)
        .sendKeys("123 Appium Street")
      .elementByXPath(tc('Done')).click()

      // Deleting user
      .then( deleteUser.bind(null, 'John Smith', 2*TIME_BASE_UNIT) )
      
      .fin(function() {
        return browser
          .sleep(TIME_BASE_UNIT) // waiting a bit before quitting
          .quit();
      });
  })
  .catch(function(err) {
    console.log(err);
    throw err;
  })
  .done();
