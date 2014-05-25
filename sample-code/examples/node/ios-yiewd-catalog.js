/* jshint esnext: true */
"use strict";

/*
TODO: UICatalog was recently updated, we need to adapt this sample code.
TODO: Lots of click errors.

First you need to install node > 0.11 to run this. 
(You may use this https://github.com/visionmedia/n for easy install/switch 
between node versions)

LOCAL APPIUM (not working with ios 7, try on Sauce Labs instead):
  node --harmony ios-yiewd-catalog.js

APPIUM ON SAUCE LABS USING SAUCE CONNECT:
  1/ Set your sauce credentials (SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables)
  2/ Start Sauce Conect
  3/ SAUCE_CONNECT=1 node --harmony ios-yiewd-catalog.js
*/

var wd = require("yiewd")
  , o_O = require("monocle-js").o_O
  , path = require("path");

require("colors");

var staticServer = require('node-static'),
    path = require("path"),
    http = require('http'),
    assetDir = path.resolve(__dirname, "../../../assets"),
    fileServer = new staticServer.Server(assetDir);

var host, port, username, accessKey, desired, server;

var desired = {
  'appium-version': '1.0',
  platformName: 'iOS',
  platformVersion: '7.1',
  deviceName: 'iPhone Simulator',
  'deviceOrientation': 'portrait'
};

if (process.env.SAUCE_CONNECT) {
  // Sauce Labs + Sauce Connect config

  // create a local server to host our app
  server = http.createServer(function (req, res) {
    req.addListener('end', function () {
      fileServer.serve(req, res);
    }).resume();
  }).listen(8080);

  host = "localhost";
  port = 4445;
  username = process.env.SAUCE_USERNAME;
  accessKey = process.env.SAUCE_ACCESS_KEY;

  desired.name = "Appium: with WD";
  desired.app = 'http://localhost:8080/UICatalog6.1.app.zip';

  // desired = {
  //   platform: 'ios',
  //   version: '7.1',
  //   device: 'iPhone Simulator',
  //   deviceName: 'iPhone Retina (4-inch 64-bit)',
  //   name: "Appium: with WD",
  //   app: 'http://localhost:8080/UICatalog6.1.app.zip',
  //   newCommandTimeout: 60
  // };
} else {
  // local config

  host = "localhost";
  port = 4723;

  var appPath = path.resolve(__dirname, "..", "..", "apps", "UICatalog", "build",
                             "Release-iphonesimulator", "UICatalog.app");
  desired.app = appPath;
  // desired = {
  //   device: 'iPhone Simulator',
  //   name: "Appium: with WD",
  //   platform: "Mac",
  //   app: appPath,
  //   // version: "6.0",
  //   browserName: "",
  //   newCommandTimeout: 60
  // };
}

var browser = wd.remote(host, port, username, accessKey);
// See whats going on
browser.on('status', function (info) {
  console.log(info.cyan);
});
browser.on('command', function (meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

var scrollToElement = o_O(function* (element) {
  var y = (yield element.getLocation()).y;
  while (y === 0 || y > 400) {
    // move so top of screen is y - 10
    var swipeOpts = {
      duration: 0.5,
      startY: 0.7,
      endY: 0.3
    };
    yield browser.execute("mobile: swipe", [swipeOpts]);
    y = (yield element.getLocation()).y;
    yield browser.sleep(0.5);
  }
});

browser.run(function* () {
  try {
    yield this.init(desired);
    yield this.elementByName("Buttons, Various uses of UIButton").click();
    var btns = yield this.elementsByIosUIAutomation('.buttons()');
    for (var i = 1; i < 4; i++) {
      yield btns[i].click();
    }
    yield btns[0].click();
    yield this.elementByName("Controls, Various uses of UIControl").click();
    var stdSwitch = yield this.elementByXPath("//switch[@name='Standard']");
    yield stdSwitch.sendKeys(true);
    yield stdSwitch.sendKeys(false);
    var stdSlider = yield this.elementByXPath("//slider[@name='Standard']");
    yield stdSlider.sendKeys("0.25");
    yield stdSlider.sendKeys("0.8");
    yield this.execute("mobile: swipe", [{endY: 0.05, duration: 0.8}]);
    var cstSlider = yield this.elementByXPath("//slider[@name='Custom']");
    yield scrollToElement(cstSlider);
    yield cstSlider.sendKeys("1.0");
    // var pages = yield this.elementByTagName("pageIndicator");
    // yield scrollToElement(pages);
    // for (i = 0; i < 10; i += 2) {
    //   yield pages.sendKeys(i);
    // }
    yield this.elementByName("Back").click();

    yield this.elementByName("TextFields, Uses of UITextField").click();
    yield this.elementByIosUIAutomation(".textFields();").sendKeys("Hello World!\n");
    yield this.elementByName("Back").click();
    yield this.elementByName("Pickers, Uses of UIDatePicker, UIPickerView").click();
    // var pickers = yield this.elementsByTagName("picker");
    // console.log(pickers[2].elementsByTagName);
    // var wheels = yield pickers[2].elementsByTagName("pickerwheel");
    // yield wheels[0].sendKeys("Serena Auroux");
    // yield this.elementByName("Back").click();
    // yield this.elementByName("Images, Use of UIImageView").click();
    // yield this.elementByTagName("slider").sendKeys("0.8");
    // yield this.sleep(2);
    yield this.elementByName("Back").click();

    // todo: This part didn't work on Sauce 6.1
    // yield this.elementByName("Web, Use of UIWebView").click();
    //var handles = yield this.windowHandles();
    //yield this.windowHandle(handles[0]);
    // yield this.get("https://www.saucelabs.com");
    // yield this.execute("mobile: leaveWebView");
    // yield this.elementByName("Back").click();

    console.log(yield this.source());
  } catch (e) {
    console.log(e);
  }
  yield this.sleep(3);
  yield this.quit();
  if (server) server.close();
});
