const webdriverio = require('webdriverio');
const iosOptions = require('../../helpers/caps').iosOptions;
const app = require('../../helpers/apps').iosTestApp;
const assert = require('chai').assert;

iosOptions.desiredCapabilities.browserName = 'Safari';

describe('Create Safari session', function () {
  it('should create and destroy IOS Safari session', async function () {
    const client = webdriverio.remote(iosOptions);
    return client.init()
      .getUrl('https://www.google.com')
      .title(function (result) {
        assert.equal(result.value, 'Google');
      })
      .end();
  });
});