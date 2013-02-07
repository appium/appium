var wd = require("wd")
  , assert = require("assert")
  , username = process.env.SAUCE_USERNAME // Omit for a local test run
  , accessKey = process.env.SAUCE_ACCESS_KEY // Omit for a local test run
  , appURL = "http://appium.s3.amazonaws.com/TestApp.app.zip";

// Instantiate a new browser sessoin
var browser = wd.remote(
  "ondemand.saucelabs.com" // Omit for a local test run
  , 80, username, accessKey // Omit for a local test run
);

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
    , name: "Appium: with WD"
    , platform:'Mac 10.8'
    , app: appURL
    , version: ''
    , browserName: ''
  })
  .elementsByTagName("textField", function(err, els) {
    els[0].type('2', function(err) {
      els[1].type('3', function(err) {
        browser.elementsByTagName('button', function(err, btns) {
          btns[0].click(function(err) {
            browser.elementsByTagName('staticText', function(err, texts) {
              texts[0].text(function(err, str) {
                assert.equal(str, 5);
                browser.quit();
              })
            })
          });
        })
      });
    });
  })
