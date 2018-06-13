const webdriverio = require("webdriverio");
const iosOptions = require("../../helpers/caps").iosWebOptions;
const app = require("../../helpers/apps").iosTestApp;
const assert = require("chai").assert;

describe("Create Safari session", function() {
  it("should create and destroy IOS Safari session", async function() {
    let client = webdriverio.remote(iosOptions);
    return client
      .init()
      .url("https://www.google.com")
      .title(function(result) {
        assert.equal(result.value, "Google");
      })
      .end();
  });
});
