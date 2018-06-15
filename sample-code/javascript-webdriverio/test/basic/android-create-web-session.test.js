const webdriverio = require("webdriverio");
const androidOptions = require("../../helpers/caps").androidWebOptions;
const app = require("../../helpers/apps").androidApiDemos;
const assert = require("chai").assert;

describe("Create Chrome web session", function() {
  let client;

  before(function() {
    client = webdriverio.remote(androidOptions);
    return client.init();
  });

  after(function() {
    return client.end();
  });

  it("should create and destroy Android browser session", async function() {
    // Navigate to google.com
    return client
      .url("https://www.google.com")
      .title(function(res) {
        assert.equal(res.value, "Google");
      })
      .source(function(res) {
        assert.match(/<html/g);
      });
  });
});
