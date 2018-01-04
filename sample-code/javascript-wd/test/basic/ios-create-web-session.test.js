import wd from 'wd';
import chai from 'chai';
import { iosCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Create Safari session', function () {
  it('should create and destroy IOS Safari session', async function () {
    // Connect to Appium server
    const driver = await wd.promiseChainRemote(serverConfig);

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