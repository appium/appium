/* jshint esnext: true */
"use strict";

/*
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
  , path = require("path");

require("colors");

var staticServer = require('node-static'),
    path = require("path"),
    http = require('http'),
    assetDir = path.resolve(__dirname, "../../../assets"),
    fileServer = new staticServer.Server(assetDir);

var host, port, username, accessKey, desired, server;

var desired = {
  browserName: '',
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
} else {
  host = "localhost";
  port = 4723;
  desired.app = 'assets/UICatalog6.1.app.zip';
}

var browser = wd.remote(host, port, username, accessKey);
// See whats going on
browser.on('status', function (info) {
  console.log(info.cyan);
});
browser.on('command', function (meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

browser.run(function* () {
  try {
    yield this.init(desired);
    yield this.elementByName("Buttons, Various uses of UIButton").click();
    var btns = yield this
      .elementsByClassName('UIAButton');
    for (var i = 1; i < 4; i++) {
      yield btns[i].click();
    }
    yield btns[0].click();
    yield this.elementByName("Controls, Various uses of UIControl").click();
    var stdSwitch = yield this.elementByXPath("//UIASwitch[@name='Standard']");
    yield stdSwitch.sendKeys(true);
    yield stdSwitch.sendKeys(false);
    var stdSlider = yield this.elementByXPath("//UIASlider[@name='Standard']");
    yield stdSlider.sendKeys("0.25");
    yield stdSlider.sendKeys("0.8");
    var cstSlider = yield this.elementByXPath("//UIASlider[@name='Custom']");
    yield cstSlider.sendKeys("1.0");
    // TODO: not visible, cannot scroll to it in ios71
    // var pages = yield this.elementByClassName("UIAPageIndicator");
    // yield pages.moveTo();
    // for (var i = 0; i < 10; i += 2) {
    //   yield pages.sendKeys(i);
    //   yield this.sleep(3000);
    // }
    yield this.elementByName("Back").click();

    yield this.elementByName("TextFields, Uses of UITextField").click();
    yield this.elementByClassName("UIATextField").sendKeys("Hello World!\n");
    yield this.elementByName("Back").click();

    yield this.elementByName("Pickers, Uses of UIDatePicker, UIPickerView").click();
    var pickers = yield this.elementsByClassName("UIAPicker");
    /*var wheels =*/ yield pickers[0].elementsByClassName("UIAPickerWheel");    
    // TODO: sendKey to picker is not working
    //yield wheels[0].sendKeys("Serena Auroux");
    yield this.elementByName("Back").click();

    yield this.elementByName("Images, Use of UIImageView").click();
    yield this.elementByClassName("UIASlider").sendKeys("0.8");
    yield this.sleep(2);
    yield this.elementByName("Back").click();

    yield this.elementByName("Web, Use of UIWebView").click();
    yield this.sleep(3000);
    yield this.contexts();
    yield this.context("WEBVIEW");
    yield this.get("https://www.saucelabs.com");
    yield this.context("NATIVE_APP");
    yield this.elementByName("Back").click();

    console.log(yield this.source());
  } catch (e) {
    console.log(e);
  }
  yield this.sleep(3);
  yield this.quit();
  if (server) server.close();
});
