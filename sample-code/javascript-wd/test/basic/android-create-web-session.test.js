import wd from 'wd';
import chai from 'chai';
import { androidCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Create Chrome web session', function () {
  let driver;
  before(async function () {
    // Connect to Appium server
    driver = await wd.promiseChainRemote(serverConfig);

    // Start the session
    await driver.init({
      ...androidCaps,
      browserName: 'Chrome'
    });
  });
  after(async function () {
    // Quit the session
    await driver.quit();
  });
  it('should create and destroy Android browser session', async function () {
    // Navigate to google.com
    await driver.get('https://www.google.com');

    // Test that it was successful by checking the document title
    const pageTitle = await driver.title();
    assert.equal(pageTitle, 'Google');
  });
});
