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
driver.byX = driver.elementByXPath.bind(driver);
driver.byN = driver.elementByName.bind(driver);

driver.run(function*() {
  try {
    yield this.init(desiredCaps);
    yield this.setImplicitWaitTimeout(5000);
    yield (yield this.byX(bc('Create'))).click();
    yield (yield this.byX(ec('Name'))).sendKeys("John Smith");
    yield (yield this.byX(ec('Phone'))).sendKeys("(555) 555-5555");
    yield (yield this.byX(ec('Email'))).sendKeys("john.smith@google.io");
    yield (yield this.byX(tc('Done'))).click();
    yield (yield this.byN("Add to favorites")).click();
    yield (yield this.byN("Edit")).click();
    yield (yield this.byX(tc('Mobile'))).click();
    yield (yield this.byX("//checkedTextView[@text='Home']")).click();
    yield (yield this.byX(tc('Done'))).click();
    yield (yield this.byN("More options")).click();
    yield (yield this.byX(tc('Delete'))).click();
    yield (yield this.byX(bc('OK'))).click();
  } catch(e) {
    console.log(e);
  }
  yield this.quit();
});
