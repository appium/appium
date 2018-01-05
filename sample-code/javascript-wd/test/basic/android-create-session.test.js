import wd from 'wd';
import chai from 'chai';
import { iosCaps, androidCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Create Android session', function () {
  it('should create and destroy Android sessions', async function () {
    // Connect to Appium server
    const driver = await wd.promiseChainRemote(serverConfig);

    // Start the session
    await driver.init({
      ...androidCaps,
      app: require('../helpers/apps').androidApiDemos
    });

    // Check that we're running the ApiDemos app by checking package and activity
    const activity = await driver.getCurrentActivity();
    const pkg = await driver.getCurrentPackage();
    assert.equal(`${pkg}${activity}`, 'io.appium.android.apis.ApiDemos');

    // Quit the session
    await driver.quit();
  });
});