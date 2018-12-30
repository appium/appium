const webdriverio = require("webdriverio");
const androidOptions = require("../../helpers/caps").androidWebOptions;
const assert = require("chai").assert;

describe("Create Chrome web session", () => {
  let client;

  before(async() => {
    client = await webdriverio.remote(androidOptions);
  });

  after(async() => {
    return await client.deleteSession();
  });

  it("should create and destroy Android browser session", async() => {
    // Navigate to google.com
    let client = await webdriverio.remote(iosOptions);
    await client.url("https://www.google.com");
    const title = await client.getTitle();
    assert.equal(title, "Google");
  });
});
