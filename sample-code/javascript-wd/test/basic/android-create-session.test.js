import wd from 'wd';
import chai from 'chai';
import {
  androidCaps, serverConfig, androidApiDemos, SAUCE_TESTING,
  SAUCE_USERNAME, SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Create Android session', function () {
  it('should create and destroy Android sessions', async function () {
    // Connect to Appium server
    const driver = SAUCE_TESTING
      ? await wd.promiseChainRemote(serverConfig)
      : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

    // Start the session
    await driver.init({
      ...androidCaps,
      app: androidApiDemos
    });

    // Check that we're running the ApiDemos app by checking package and activity
    const activity = await driver.getCurrentActivity();
    const pkg = await driver.getCurrentPackage();
    assert.equal(`${pkg}${activity}`, 'io.appium.android.apis.ApiDemos');

    // Quit the session
    await driver.quit();
  });
});
