const webdriverio = require('webdriverio');
const androidOptions = require('../../helpers/caps').androidOptions;
const app = require('../../helpers/apps').androidApiDemos;
const assert = require('chai').assert;

androidOptions.desiredCapabilities.browserName = 'Chrome';

describe('Create Chrome web session', function () {
  const client;

  before(function () {
    client = webdriverio.remote(androidOptions);
    return client.init();
  });

  after(function () {
    return client.end();
  });

  it('should create and destroy Android browser session', async function () {

    // Navigate to google.com
    return client.get('https://www.google.com')
      .title(function (res) {
        assert.equal(res.value, 'Google')
      })
      .source(function (res) {
        assert.match(/<html/g);
      });
  });
});