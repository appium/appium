import wd from 'wd';
import chai from 'chai';
import {
  iosCaps, serverConfig, iosTestApp, SAUCE_TESTING, SAUCE_USERNAME,
  SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Create session', function () {
  it('should create and destroy IOS sessions', async function () {
    // Connect to Appium server
    const driver = SAUCE_TESTING
      ? await wd.promiseChainRemote(serverConfig)
      : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

    // Start the session
    await driver.init({
      ...iosCaps,
      app: iosTestApp
    });

    // Check that the XCUIElementTypeApplication was what we expect it to be
    const applicationElement = await driver.elementByClassName('XCUIElementTypeApplication');
    const applicationName = await applicationElement.getAttribute('name');
    assert.equal(applicationName, 'TestApp');

    // Quit the session
    await driver.quit();
  });
});
