import wd from 'wd';
import chai from 'chai';
import { androidCaps, serverConfig } from '../helpers/caps';

const {assert} = chai;

describe('Basic Android selectors', function () {

  let driver;

  before(async function () {
    // Connect to Appium server
    driver = await wd.promiseChainRemote(serverConfig);

    // Start the session
    await driver.init({
      ...androidCaps,
      app: require('../helpers/apps').androidApiDemos
    });
  });

  after(async function () {
    await driver.quit();
  });

  it('should find elements by Accessibility ID', async function () {
    // Look for element by accessibility. In Android this is the 'content-desc'
    const searchParametersElement = await driver.elementsByAccessibilityId('Content');
    assert.equal(searchParametersElement.length, 1);
  });

  it('should find elements by ID', async function () {
    // Look for element by ID. In Android this is the 'resource-id'
    const actionBarContainerElements = await driver.elementsById('android:id/action_bar_container');
    assert.equal(actionBarContainerElements.length, 1);
  });

  it('should find elements by class name', async function () {
    // Look for elements by the class name. In Android this is the Java Class Name of the view.
    const linearLayoutElements = await driver.elementsByClassName('android.widget.FrameLayout');
    assert.isAbove(linearLayoutElements.length, 1);
  });

  it('should find elements by XPath', async function () {
    // Find elements by XPath
    const linearLayoutElements = await driver.elementsByXPath(`//*[@class='android.widget.FrameLayout']`);
    assert.isAbove(linearLayoutElements.length, 1);
  });
});