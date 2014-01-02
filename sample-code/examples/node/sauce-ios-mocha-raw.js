/*global it:true, describe:true, before:true, after:true */

"use strict";

/* 
  1/ Set your sauce credentials (SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables)
  2/ npm install mocha -g;
  3/ Run: 
    mocha -R spec sauce-ios-mocha-raw.js 
*/

var wd = require("wd");
var Q = wd.Q;
var _ = require('underscore');

require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var host = "ondemand.saucelabs.com",
    port = 80,
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Big timeout is needed
var timeout = process.env.TIMEOUT || 300000;

var desired={
  browserName: '',
  version: '6.1',
  app: 'http://appium.s3.amazonaws.com/TestApp6.0.app.zip',
  device: 'iPhone Simulator',
  name: "Appium: with WD Mocha",
  'device-orientation': 'portrait',
  platform: "Mac"
};

describe('notes app', function() {
  this.timeout(timeout);
  var browser = null;
  var values = [];

  before(function(done) {
    browser =  wd.promiseChainRemote(host, port, username, accessKey);
    // See whats going on
    browser.on('status', function(info) {
      console.log(info.cyan);
    });
    browser.on('command', function(meth, path, data) {
      console.log(' > ' + meth.yellow, path.grey, data || '');
    });

    browser
      .init(desired)
      .nodeify(done);
  });

  after(function(done) {
    browser
      .quit()
      .nodeify(done);
  });

  it('should fill two fields with numbers', function(done) {
    browser
      .elementsByTagName('textField').then(function(elems) {
        var seq = [];
        _(elems).each(function(elem) {
          seq.push(function() {
            var val = Math.round(Math.random()*10);
            values.push(val);
            return elem.sendKeys(val);
          });
        });
        return seq.reduce(Q.when, new Q());
      })
      .elementByTagName('button')
        .click()
      .elementByTagName('staticText')
        .text().then(function(text) {
          var sum = values[0] + values[1];
          sum.should.equal(parseInt(text, 10));
        })
      .nodeify(done);
  });
});
