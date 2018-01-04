import wd from 'wd';
import chai from 'chai';
import { iosCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Create session', function () {
  it('should create and destroy IOS sessions', async function () {
    // Connect to Appium server
    const driver = await wd.promiseChainRemote(serverConfig);

    // Start the session
    await driver.init({
      ...iosCaps,
      app: require('../helpers/apps').iosTestApp
    });

    // Check that the XCUIElementTypeApplication was what we expect it to be
    const applicationElement = await driver.elementByClassName('XCUIElementTypeApplication');
    const applicationName = await applicationElement.getAttribute('name');
    assert.equal(applicationName, 'TestApp');

    // Quit the session
    await driver.quit();
  });
});