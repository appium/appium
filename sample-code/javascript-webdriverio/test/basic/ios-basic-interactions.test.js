const webdriverio = require("webdriverio");
const iosOptions = require("../../helpers/caps").iosOptions;
const app = require("../../helpers/apps").iosTestApp;
const assert = require("chai").assert;

iosOptions.desiredCapabilities.app = app;

describe("Basic IOS interactions", function() {
  let client;

  beforeEach(function() {
    client = webdriverio.remote(iosOptions);
    return client.init();
  });

  afterEach(function() {
    return client.end();
  });

  it("should send keys to inputs", function() {
    return client
      .waitForExist("~TextField1", 5000)
      .element("~TextField1")
      .setValue("Hello World!")
      .getText("~TextField1", function(result) {
        assert.equal(result.value, "Hello World!");
      });
  });

  it("should click a button that opens an alert", async function() {
    return client
      .waitForExist("~show alert", 5000)
      .element("~show alert")
      .click()
      .waitForExist("~Cool title", 5000)
      .getText("~Cool title", function(result) {
        assert.equal(result.value, "Cool title");
      });
  });
});
