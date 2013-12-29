// WD.js driver
var wd = require("wd");

// Test libraries
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

// Enable chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Appium server info
var host = process.env.APPIUM_HOST || "localhost",
    port = parseInt(process.env.APPIUM_PORT || 4723);

// Browser/app config
var appURL = "http://appium.s3.amazonaws.com/TestApp6.0.app.zip";
var desired={
  device: 'iPhone Simulator', 
  name: "Appium: with WD", 
  platform: "Mac", 
  app: appURL,
  // version: "6.0",
  browserName: "",
  newCommandTimeout: 60
};

// Instantiate a new browser session
var browser = wd.promiseChainRemote(host , port);

// See whats going on
browser.on('status', function(info) {
  console.log(info.cyan);
});
browser.on('command', function(meth, path, data) {
  console.log(' > ' + meth.yellow, path.grey, data || '');
});

// Run the test
browser
  .init(desired)
  .elementsByTagName("textField").then(function(els) {
    return els[0].type('2').then(function() {
      return els[1].type('3');
    });
  })
  .elementByTagName('button')
    .click()
  .elementByTagName('staticText')
    .text().should.become("5")
  .fin(function() { return browser.quit(); })
  .done();
