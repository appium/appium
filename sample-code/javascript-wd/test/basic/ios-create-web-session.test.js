import wd from 'wd';
import chai from 'chai';
import {
  iosCaps, serverConfig, SAUCE_TESTING, SAUCE_USERNAME, SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Create Safari session', function () {
  it('should create and destroy IOS Safari session', async function () {
    // Connect to Appium server
    const driver = SAUCE_TESTING
      ? await wd.promiseChainRemote(serverConfig)
      : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

    // Start the session
    await driver.init({
      ...iosCaps,
      browserName: 'Safari'
    });

    // Navigate to google.com
    await driver.get('https://www.google.com');

    // Test that it was successful by checking the document title
    const pageTitle = await driver.title();
    assert.equal(pageTitle, 'Google');

    // Quit the session
    await driver.quit();
  });
});
