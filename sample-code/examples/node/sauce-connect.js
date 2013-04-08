/*global it:true */

/* EXAMPLE APPIUM + SAUCE LABS INTEGRATION PLUS SAUCE CONNECT
   First: npm install mocha -g && npm install wd && npm install node-static
   Second: make sure Sauce Connect is running
   Usage: SAUCE_USERNAME=xxx SAUCE_ACCESS_KEY=yyy mocha -t 60000 sauce-connect.js */

"use strict";

var should = require("should")
  , staticServer = require('node-static')
  , path = require("path")
  , http = require('http')
  , connectUrl = 'http://localhost:8080/TestApp6.0.app.zip'
  , dbPath = "../../../test/helpers/driverblock.js"
  , assetDir = path.resolve(__dirname, "../../../assets")
  , fileServer = new staticServer.Server(assetDir)
  , describeSauce = require(dbPath).describeForSauce(connectUrl);

// create a local server to host our app
var server = http.createServer(function(req, res) {
  req.addListener('end', function() {
    fileServer.serve(req, res);
  });
}).listen(8080);

// run the tests, having sauce first download the app from our local server
describeSauce('calc app', function(h) {
  var values = [];
  var populate = function(driver, cb) {
    driver.elementsByTagName('textField', function(err, elems) {
      should.not.exist(err);
      var next = function(num) {
        if (num >= elems.length) {
          return cb(elems);
        }
        var val = Math.round(Math.random()*10);
        values.push(val);
        var elem = elems[num++];
        elem.sendKeys(val, function() {
          next(num);
        });
      };
      next(0);
    });
  };

  return it('should fill two fields with numbers', function(done) {
    var driver = h.driver;
    populate(driver, function() {
      driver.elementsByTagName('button', function(err, buttons) {
        buttons[0].click(function() {
          driver.elementsByTagName('staticText', function(err, elems) {
            elems[0].text(function(err, text) {
              var sum = values[0] + values[1];
              sum.should.equal(parseInt(text, 10));
              driver.quit(function() {
                server.close();
                done();
              });
            });
          });
        });
      });
    });
  });
}, undefined, undefined, {name: "Appium Test on Sauce"});
