"use strict";

/*
run:
  node local-android-wd-contacts.js
*/

var wd = require("wd"),
    path = require('path');
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
var Q = require('q');

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

// Instantiate a new browser session
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
  .init(desired).then(function () {
    return browser
      // add new contact
      .elementByName("Add Contact")
      .click()
      .elementsByClassName("android.widget.EditText")
      .then(function(elements){
        return Q.all([
          elements[0].type("some name")
            .text()
            .should.eventually.include('some'),
          elements[2].type("Some@example.com")
            .text()
            .should.eventually.include('Some@example.com')
        ]);
      })
      .elementByName("Save")
      .click()
      .fin(function () {
        return browser
          .sleep(TIME_BASE_UNIT) // waiting a bit before quitting
          .quit();
      });
  })
  .catch(function (err) {
    console.log(err);
    throw err;
  })
  .done();
