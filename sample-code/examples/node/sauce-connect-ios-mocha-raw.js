/*global it:true, describe:true, beforeEach:true, afterEach:true */


/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION
   First: npm install mocha -g; npm install wd
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha -R spec sauce.js */

// WD.js driver
var wd = require("wd");
var Q = wd.Q;
var _ = require('underscore');

// Test libraries
require('colors');
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

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

// Enable chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// Appium server info
var host = process.env.APPIUM_HOST || "localhost",
    port = parseInt(process.env.APPIUM_PORT || 4445),
    username = process.env.SAUCE_USERNAME,
    accessKey = process.env.SAUCE_ACCESS_KEY;

// Big timeout is needed
var timeout = process.env.TIMEOUT || 300000;

// Browser/app config
var appUrl = 'http://localhost:8080/TestApp6.0.app.zip';
var desired={
  browserName: '',
  version: '6.1',
  app: appUrl,
  device: 'iPhone Simulator',
  name: "Appium: with WD Mocha", 
  'device-orientation': 'portrait',
  platform: "Mac"
};

describe('notes app', function() {
  this.timeout(timeout);
  var browser = null;
  var values = [];

  beforeEach(function(done) {
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

  afterEach(function(done) {
    browser
      .quit()
      .nodeify(done);
  });

  it('should fill two fields with numbers', function(done) {
    browser
      .elementsByTagName('textField').then(function(elems) {
        seq = [];
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

