"use strict";

// WD.js driver
var wd = require("wd"),
    Q = wd.Q,
    path = require("path");

// Test libraries
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

// Enable chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Browser/app config
var appURL = path.resolve(__dirname, '../../apps/ContactManager/ContactManager.apk');
console.log(appURL);
var desired = {
    device: 'Android',
    platform: "Linux",
    app: appURL,
    "app-package": "com.example.android.contactmanager",
    "app-activity": ".ContactManager"
};

// Instantiate a new browser session
var browser = wd.promiseChainRemote("localhost" , 4723);

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

// Run the test
browser
  .init(desired).then(function() {
    return browser
      .elementByName("Add Contact")
        .click()
      .waitForElementByTagName('textfield', 5000)
      .elementsByTagName('textfield').then(function(els) {
        var seq = [
          function() { return els[0].sendKeys("Some Name"); },
          function() { return els[2].sendKeys("Some@example.com"); }
        ];
        return seq.reduce(Q.when, new Q());
      })
      .elementByName('Save')
        .click()
      .sleep(1000)
      .fin(function() { return browser.quit(); });
  })
  .catch(function(err) {console.log(err);})
  .done();
