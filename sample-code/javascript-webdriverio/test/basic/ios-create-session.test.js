const webdriverio = require("webdriverio");
const iosOptions = require("../../helpers/caps").iosOptions;
const app = require("../../helpers/apps").iosTestApp;
const assert = require("chai").assert;

iosOptions.capabilities.app = app;

describe("Create session",() => {
  let client;

  beforeEach(async() => {
    client = await webdriverio.remote(iosOptions);
  });

  it("should create and destroy IOS sessions", async() => {
    const res = await client.status();
    assert.isObject(res.build);
    const element = await client.findElement("class name","XCUIElementTypeApplication");
    client.getElementAttribute(element.ELEMENT,"name").then((attr) => {
       assert.equal(attr,"TestApp");
     });
    const destroySession = await client.deleteSession();
    assert.isNull(destroySession);
  });
});
