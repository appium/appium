const webdriverio = require("webdriverio");
const iosOptions = require("../../helpers/caps").iosWebOptions;
const app = require("../../helpers/apps").iosTestApp;
const assert = require("chai").assert;

describe("Create Safari session", function() {
  it("should create and destroy IOS Safari session", async function() {
    let client = await webdriverio.remote(iosOptions);
    await client.url("https://www.google.com");
    const title = await client.getTitle();
    assert.equal(title, "Google");
    await client.deleteSession();
  });
});
