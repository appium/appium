// run with: node --harmony yiewd.js

// todo: this app is not in the repo anymore

var wd = require("yiewd")
  , should = require("should")
  , o_O = require("monocle-js").o_O
  , path = require("path");

// Appium server info
var host = process.env.APPIUM_HOST || "localhost",
    port = parseInt(process.env.APPIUM_PORT || 4723);

// Browser/app config
var appURL = path.resolve(__dirname, "..", "..", "apps", "UICatalog", "build",
                           "Release-iphonesimulator", "UICatalog.app");
console.log(appURL);
var desired={
  device: 'iPhone Simulator', 
  name: "Appium: with WD", 
  platform: "Mac", 
  app: appURL,
  // version: "6.0",
  browserName: "",
  newCommandTimeout: 60
};

var driver = wd.remote(host, port);

var scrollToElement = o_O(function*(element) {
  var y = (yield element.getLocation()).y;
  while (y == 0 || y > 400) {
    // move so top of screen is y - 10
    var swipeOpts = {
      duration: 0.5
      , startY: 0.7
      , endY: 0.3
    }
    yield driver.execute("mobile: swipe", [swipeOpts]);
    y = (yield element.getLocation()).y;
    yield driver.sleep(0.5);
  }
});

driver.run(function*() {
  try {
    yield this.init(desired);
    yield (yield this.elementByName("Buttons, Various uses of UIButton")).click();
    var btns = yield this.elementsByTagName("button");
    for (var i = 1; i < 4; i++) {
      yield btns[i].click();
    }
    yield btns[0].click();
    yield (yield this.elementByName("Controls, Various uses of UIControl")).click();
    var stdSwitch = yield this.elementByXPath("//switch[@name='Standard']");
    yield stdSwitch.sendKeys(true);
    yield stdSwitch.sendKeys(false);
    var stdSlider = yield this.elementByXPath("//slider[@name='Standard']");
    yield stdSlider.sendKeys("0.25");
    yield stdSlider.sendKeys("0.8");
    yield driver.execute("mobile: swipe", [{endY: 0.05, duration: 0.8}]);
    var cstSlider = yield this.elementByXPath("//slider[@name='Custom']");
    yield scrollToElement(cstSlider);
    yield cstSlider.sendKeys("1.0");
    var pages = yield this.elementByTagName("pageIndicator");
    yield scrollToElement(pages);
    for (i = 0; i < 10; i += 2) {
      yield pages.sendKeys(i);
    }
    yield (yield this.elementByName("Back")).click();
    yield (yield this.elementByName("TextFields, Uses of UITextField")).click();
    yield (yield this.elementByTagName("textfield")).sendKeys("Hello World!\n");
    yield (yield this.elementByName("Back")).click();
    yield (yield this.elementByName("Pickers, Uses of UIDatePicker, UIPickerView")).click();
    var pickers = yield this.elementsByTagName("picker");
    console.log(pickers[2].elementsByTagName);
    var wheels = yield pickers[2].elementsByTagName("pickerwheel");
    yield wheels[0].sendKeys("Serena Auroux");
    yield (yield this.elementByName("Back")).click();
    yield (yield this.elementByName("Images, Use of UIImageView")).click();
    yield (yield this.elementByTagName("slider")).sendKeys("0.8");
    yield this.sleep(2);
    yield (yield this.elementByName("Back")).click();
    yield (yield this.elementByName("Web, Use of UIWebView")).click();
    var handles = yield this.windowHandles();
    yield this.windowHandle(handles[0]);
    yield this.get("https://www.saucelabs.com");
    yield this.execute("mobile: leaveWebView");
    yield (yield this.elementByName("Back")).click();
    console.log(yield this.source());
  } catch (e) {
    console.log(e);
  }
  yield this.sleep(3);
  yield this.quit();
});
