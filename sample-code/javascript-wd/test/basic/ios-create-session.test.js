import wd from 'wd';
import chai from 'chai';
import {
  iosCaps, serverConfig, iosTestApp, SAUCE_TESTING, SAUCE_USERNAME,
  SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Create session', function () {
  let driver;
  let allPassed = true;
  afterEach(function () {
    // keep track of whether all the tests have passed, since mocha does not do this
    allPassed = allPassed && (this.currentTest.state === 'passed');
  });
  after(async function () {
    if (SAUCE_TESTING && driver) {
      await driver.sauceJobStatus(allPassed);
    }
  });

  it('should create and destroy iOS sessions', async function () {
    try {
      // Connect to Appium server
      driver = SAUCE_TESTING
        ? await wd.promiseChainRemote(serverConfig)
        : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

      // add the name to the desired capabilities
      const sauceCaps = SAUCE_TESTING
        ? {
          name: 'iOS Create Session Test',
        }
        : {};

      // Start the session
      await driver.init({
        ...iosCaps,
        ...sauceCaps,
        app: iosTestApp,
      });

      // Check that the XCUIElementTypeApplication was what we expect it to be
      const applicationElement = await driver.elementByClassName('XCUIElementTypeApplication');
      const applicationName = await applicationElement.getAttribute('name');
      assert.equal(applicationName, 'TestApp');
    } finally {
      // Quit the session, no matter what happens
      await driver.quit();
    }
  });
});
