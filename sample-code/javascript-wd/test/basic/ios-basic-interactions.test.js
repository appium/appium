import wd from 'wd';
import chai from 'chai';
import { iosCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Basic IOS interactions', function () {

  let driver;

  before(async function () {
    // Connect to Appium server
    driver = await wd.promiseChainRemote(serverConfig);

    // Start the session
    await driver.init({
      ...iosCaps,
      app: require('../helpers/apps').iosTestApp
    });
  });

  after(async function () {
    await driver.quit();
  });

  it('should send keys to inputs', async function () {
    // Find TextField input element
    const textInputId = `TextField1`;
    await driver.waitForElementByAccessibilityId(textInputId);
    const textViewsEl = await driver.elementByAccessibilityId(textInputId);

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
    await driver.waitForElementByAccessibilityId(buttonElementId);
    const buttonElement = await driver.elementByAccessibilityId(buttonElementId);
    await buttonElement.click();

    // Wait for the alert to show up
    const alertTitleId = `Cool title`;
    await driver.waitForElementByAccessibilityId(alertTitleId);
    const alertTitleElement = await driver.elementByAccessibilityId(alertTitleId);

    // Check the text
    const alertTitle = await alertTitleElement.text();
    assert.equal(alertTitle, `Cool title`);
  });
});