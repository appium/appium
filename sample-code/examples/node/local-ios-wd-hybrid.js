"use strict";

/*
  run:
    node local-ios-wd-hybrid.js
*/


var wd = require("wd");

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var desired = {
    device: 'iPhone Simulator',
    name: "Appium Hybrid App: with WD",
    platform:'Mac',
    app: "http://appium.s3.amazonaws.com/WebViewApp6.0.app.zip",
    // version: '6.0',
    browserName: '',
    newCommandTimeout: 60
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
  .init(desired)
  .then(function() {
    browser
      .windowHandles().then(function(handles) {
        handles.should.have.length.above(0);
        return browser
          .window(handles[0])
          .elementById('i_am_an_id')
            .text().should.become("I am a div");
      })
      .execute("mobile: leaveWebView")
      .fin(function() {
        return browser
          .sleep(3000)
          .quit();
      });
  })
  .catch(function(err) {
    console.log(err);
    throw err;
  })
  .done();
