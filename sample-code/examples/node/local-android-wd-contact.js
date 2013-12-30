// WD.js driver
var wd = require("wd"),
    path = require("path");

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


// File classpathRoot = new File(System.getProperty("user.dir"));
// File appDir = new File(classpathRoot, "../../../apps/ContactManager");
// File app = new File(appDir, "ContactManager.apk");
// DesiredCapabilities capabilities = new DesiredCapabilities();
// capabilities.setCapability("device","Android");
// capabilities.setCapability(CapabilityType.BROWSER_NAME, "");
// capabilities.setCapability(CapabilityType.VERSION, "4.2");
// capabilities.setCapability(CapabilityType.PLATFORM, "MAC");
// capabilities.setCapability("app", app.getAbsolutePath());
// capabilities.setCapability("app-package", "com.example.android.contactmanager");
// capabilities.setCapability("app-activity", ".ContactManager");
// driver = new SwipeableWebDriver(new URL("http://127.0.0.1:4723/wd/hub"), capabilities);

// Browser/app config
var appURL = path.resolve(__dirname, '../../app/ContactManager/ContactManager.apk');
var desired = {
    device: 'Android',
    //browserName: "",
    //version: "4.2",
    //platform: "MAC",
    app: appURL,
    "app-package": "com.example.android.contactmanager",
    "app-activity": ".ContactManager"
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
  .init(desired).then(function() {
    browser
      .get("http://saucelabs.com/test/guinea-pig")
      .elementById('i_am_an_id')
        .text().should.become("I am a div")
      .elementById('comments')
        .sendKeys("This is an awesome comment")
      .elementById('submit')
        .click()
      .waitForElementById('your_comments', 
        wd.asserters.textInclude("This is an awesome comment"))
      .fin(function() { return browser.quit(); });
  })
  .catch(function(err) {console.log(err);})
  .done();
