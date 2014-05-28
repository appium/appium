/*global it:true, describe:true, before:true, after:true */

"use strict";

/* 
  1/ Set your sauce credentials (SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables)
  2/ npm install mocha -g;
  3/ Start Sauce Connect
  4/ Run: 
    mocha -R spec sauce-connect-ios-mocha-wd-raw.js 
*/

var wd = require("wd"),
    Q = wd.Q,
    _ = require('underscore');

require('colors');
var chai = require("chai"),
    chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var staticServer = require('node-static'),
    path = require("path"),
    http = require('http'),
    assetDir = path.resolve(__dirname, "../../../assets"),
    fileServer = new staticServer.Server(assetDir);

// create a local server to host our app
var server = http.createServer(function(req, res) {
  req.addListener('end', function() {
    fileServer.serve(req, res);
  }).resume();
}).listen(8080);

var host = "localhost",
    port = 4445,
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Big timeout is needed
var timeout = process.env.TIMEOUT || 300000;

// Browser/app config
var appUrl = 'http://localhost:8080/TestApp6.0.app.zip';
var desired = {
  browserName: '',  
  'appium-version': '1.0',
  platformName: 'iOS',
  platformVersion: '7.1',
  deviceName: 'iPhone Simulator',
  app: appUrl,
  name: "Appium: with WD Mocha",
  'deviceOrientation': 'portrait',
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
    server.close();
    browser
      .quit()
      .nodeify(done);
  });

  it('should fill two fields with numbers', function(done) {
    browser
      .elementsByIosUIAutomation('.textFields();').then(function(elems) {
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
      .elementByIosUIAutomation('.buttons()')
        .click()
        .elementByClassName('UIAStaticText')
          .text().then(function(text) {
            var sum = values[0] + values[1];
            sum.should.equal(parseInt(text, 10));
          })
      .nodeify(done);
  });
});

