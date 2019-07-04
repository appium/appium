import wd from 'wd';
import chai from 'chai';
import {
  androidCaps, serverConfig, SAUCE_TESTING, SAUCE_USERNAME, SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Create Chrome web session', function () {
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

  it('should create and destroy Android browser session', async function () {
    try {
      // Connect to Appium server
      driver = SAUCE_TESTING
        ? await wd.promiseChainRemote(serverConfig)
        : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

      // add the name to the desired capabilities
      const sauceCaps = SAUCE_TESTING
        ? {
          name: 'Android Create Web Session Test',
        }
        : {};

      // Start the session
      await driver.init({
        ...androidCaps,
        ...sauceCaps,
        browserName: 'Chrome',
      });

      // Navigate to google.com
      await driver.get('https://www.google.com');

      // Test that it was successful by checking the document title
      const pageTitle = await driver.title();
      assert.equal(pageTitle, 'Google');
    } finally {
      // Quit the session, no matter what happens
      await driver.quit();
    }
  });

  it('should create and destroy Android browser session', async function () {

  });
});
