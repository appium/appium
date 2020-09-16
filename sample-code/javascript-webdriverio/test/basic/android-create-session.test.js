const webdriverio = require('webdriverio');
const androidOptions = require('../../helpers/caps').androidOptions;
const app = require('../../helpers/apps').androidApiDemos;
const assert = require('chai').assert;

androidOptions.capabilities.app = app;

describe('Create Android session', function () {
  let client;

  before(async function () {
    client = await webdriverio.remote(androidOptions);
  });

  it('should create and destroy a session', async function () {
    const res = await client.status();
    assert.isObject(res.build);

    const currentPackage = await client.getCurrentPackage();
    assert.equal(currentPackage, 'io.appium.android.apis');

    const deleteSession = await client.deleteSession();
    assert.isNull(deleteSession);
  });
});
