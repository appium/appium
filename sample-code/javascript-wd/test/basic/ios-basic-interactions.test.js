import wd from 'wd';
import chai from 'chai';
import {
  iosCaps, serverConfig, iosTestApp, SAUCE_TESTING, SAUCE_USERNAME,
  SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Basic IOS interactions', function () {
  let driver;
  let allPassed = true;

  before(async function () {
    // Connect to Appium server
    driver = SAUCE_TESTING
      ? await wd.promiseChainRemote(serverConfig)
      : await wd.promiseChainRemote(serverConfig, SAUCE_USERNAME, SAUCE_ACCESS_KEY);

    // add the name to the desired capabilities
    const sauceCaps = SAUCE_TESTING
      ? {
        name: 'iOS Basic Interactions Test',
      }
      : {};

    // merge all the capabilities
    const caps = {
      ...iosCaps,
      ...sauceCaps,
      app: iosTestApp,
    };

    // Start the session, merging all the caps
    await driver.init(caps);
  });

  afterEach(function () {
    // keep track of whether all the tests have passed, since mocha does not do this
    allPassed = allPassed && (this.currentTest.state === 'passed');
  });

  after(async function () {
    await driver.quit();
    if (SAUCE_TESTING && driver) {
      await driver.sauceJobStatus(allPassed);
    }
  });

  it('should send keys to inputs', async function () {
    // Find TextField input element
    const textInputId = `TextField1`;
    const textViewsEl = await driver.waitForElementByAccessibilityId(textInputId);

    // Check that it doesn't have a value
    let value = await textViewsEl.getValue();
    assert.isNull(value, 'Input should have no value');

    // Send keys to that input
    await textViewsEl.sendKeys('Hello World!');

    // Check that the input has new value
    value = await textViewsEl.getValue();
    assert.equal(value, 'Hello World!', 'Input should have newly input value');
  });

  it('should click a button that opens an alert', async function () {
    // Find Button element and click on it
    const buttonElementId = `show alert`;
    const buttonElement = await driver.waitForElementByAccessibilityId(buttonElementId);
    await buttonElement.click();

    // Wait for the alert to show up
    const alertTitleId = `Cool title`;
    const alertTitleElement = await driver.waitForElementByAccessibilityId(alertTitleId);

    // Check the text
    const alertTitle = await alertTitleElement.text();
    assert.equal(alertTitle, `Cool title`);
  });
});
