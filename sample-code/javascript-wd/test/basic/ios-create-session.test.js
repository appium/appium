import wd from 'wd';
import chai from 'chai';
import { iosCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Create session', function () {
  it('should create and destroy IOS sessions', async function () {
    // Connect to Appium server
    const driver = await wd.promiseChainRemote(serverConfig);

    // We haven't started a session yet, so we shouldn't see any sessions running
    assert.equal((await driver.sessions()).length, 0);

    // Start the session
    await driver.init({
      ...iosCaps,
      app: require('../helpers/apps').iosTestApp
    });

    // Now that session is running, check that 'sessions' length is one
    assert.equal((await driver.sessions()).length, 1);

    // Check that the XCUIElementTypeApplication was what we expect it to be
    const applicationElement = await driver.elementByClassName('XCUIElementTypeApplication');
    const applicationName = await applicationElement.getAttribute('name');
    assert.equal(applicationName, 'TestApp');

    // Quit the session
    await driver.quit();

    // Session is closed, so we should be back to having no sessions
    assert.equal((await driver.sessions()).length, 0);
  });
});