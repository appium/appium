var wd = require("wd")
  , assert = require("assert")
  , appURL = "http://appium.s3.amazonaws.com/TestApp6.0.app.zip";

// Instantiate a new browser session
var browser = wd.remote("localhost", 4723);

// See whats going on
browser.on("status", function(info) {
  console.log('\x1b[36m%s\x1b[0m', info);
});

browser.on("command", function(meth, path, data) {
  console.log(' > \x1b[33m%s\x1b[0m: %s', meth, path, data || '');
});

// Run the test
browser
  .chain()
  .init({
    device: ""
    , name: "Appium: with WD"
    , platform: "Mac"
    , app: appURL
    , version: "6.0"
    , browserName: ""
    , newCommandTimeout: 60
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
