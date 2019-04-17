import wd from 'wd';
import chai from 'chai';
import {
  androidCaps, serverConfig, androidApiDemos, SAUCE_TESTING, SAUCE_USERNAME,
  SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Basic Android selectors', function () {
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
        name: 'Android Selectors Tests',
      }
      : {};

    // merge all the capabilities
    const caps = {
      ...androidCaps,
      ...sauceCaps,
      app: androidApiDemos,
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
