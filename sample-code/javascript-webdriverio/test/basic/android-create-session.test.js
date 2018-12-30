const webdriverio = require("webdriverio");
const androidOptions = require("../../helpers/caps").androidOptions;
const app = require("../../helpers/apps").androidApiDemos;
const assert = require("chai").assert;

androidOptions.capabilities.app = app;

describe("Create Android session", () => {
  let client;

  before(async() => {
    client = await webdriverio.remote(androidOptions);
  });

  it("should create and destroy a session", async() => {
     const res = await client.status();
     assert.isObject(res.build);
     const current_package = await client.getCurrentPackage();
     assert.equal(current_package, "io.appium.android.apis");
     const delete_session = await client.deleteSession();
     assert.isNull(delete_session);
  });
});
