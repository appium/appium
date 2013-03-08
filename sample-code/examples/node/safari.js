"use strict";

var wd = require("wd")
  , should = require("should");

// Instantiate a new browser sessoin
var browser = wd.remote("localhost", 4723);

// See whats going on
browser.on('status', function(info) {
  console.log('\x1b[36m%s\x1b[0m', info);
});

browser.on('command', function(meth, path, data) {
  console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path, data || '');
});

// Run the test
browser
  .chain()
  .init({
    device: 'iPhone Simulator'
    , name: "Appium Hybrid App: with WD"
    , platform:'Mac 10.8'
    , app: "safari"
    , version: '6.1'
    , browserName: ''
  })
  .get("http://saucelabs.com/test/guinea-pig", function(err) {
    should.not.exist(err);
    browser.elementById('i_am_an_id', function(err, el) {
      should.not.exist(err);
      el.text(function(err, text) {
        text.should.eql("I am a div");
        browser.elementById('comments', function(err, comments) {
          should.not.exist(err);
          comments.sendKeys("This is an awesome comment", function() {
            browser.elementById('submit', function(err, submit) {
              submit.click(function() {
                var next = function() {
                  browser.elementById('your_comments', function(err, res) {
                    res.text(function(err, text) {
                      text.should.include("This is an awesome comment");
                      browser.quit();
                    });
                  });
                };
                setTimeout(next, 1000);
              });
            });
          });
        });
      });
    });
  });
