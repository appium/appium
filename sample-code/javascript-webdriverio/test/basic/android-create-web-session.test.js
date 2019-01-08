const webdriverio = require('webdriverio');
const androidOptions = require('../../helpers/caps').androidWebOptions;
const assert = require('chai').assert;

describe('Create Chrome web session', function () {
  let client;

  before(async function () {
    client = await webdriverio.remote(androidOptions);
  });

  after(async function () {
    return await client.deleteSession();
  });

  it('should create and destroy Android browser session', async function () {
    // Navigate to google.com
    const client = await webdriverio.remote(androidOptions);
    await client.url('https://www.google.com');

    const title = await client.getTitle();
    assert.equal(title, 'Google');
  });
});
