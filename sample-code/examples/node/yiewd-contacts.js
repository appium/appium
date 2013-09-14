/*global it:true */

"use strict";

var wd = require("yiewd")
  , o_O = require("monocle-js").o_O;

var desiredCaps = {
  device: 'Android'
  , "app-package": "com.android.contacts"
  , "app-activity": "activities.PeopleActivity"
};

var driver = wd.remote('localhost', 4723);
var bc = function(t) { return "//button[contains(@text, '" + t + "')]"; };
var ec = function(t) { return "//editText[contains(@text, '" + t + "')]"; };
var tc = function(t) { return "//text[contains(@text, '" + t + "')]"; };

driver.run(function*() {
  try {
    yield this.init(desiredCaps);
    yield this.setImplicitWaitTimeout(5000);
    yield this.elementByXPath(bc('Create')).click();
    yield this.elementByXPath(ec('Name')).sendKeys("John Smith");
    yield this.elementByXPath(ec('Phone')).sendKeys("(555) 555-5555");
    yield this.elementByXPath(ec('Email')).sendKeys("john.smith@google.io");
    yield this.elementByXPath(tc('Done')).click();
    yield this.elementByName("Add to favorites").click();
    yield this.elementByName("Edit").click();
    yield this.elementByXPath(tc('Mobile')).click();
    yield this.elementByXPath("//checkedTextView[@text='Home']").click();
    yield this.elementByXPath(tc('Done')).click();
    yield this.elementByName("More options").click();
    yield this.elementByXPath(tc('Delete')).click();
    yield this.elementByXPath(bc('OK')).click();
  } catch(e) {
    console.log(e);
  }
  yield this.quit();
});
