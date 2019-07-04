import wd from 'wd';
import chai from 'chai';
import {
  iosCaps, serverConfig, iosTestApp, SAUCE_TESTING, SAUCE_USERNAME,
  SAUCE_ACCESS_KEY
} from '../helpers/config';

const {assert} = chai;

describe('Basic IOS selectors', function () {
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
        name: 'iOS Selectors Test',
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

  it('should find elements by Accessibility ID', async function () {
    // This finds elements by 'accessibility id', which in the case of IOS is the 'name' attribute of the element
    const computeSumButtons = await driver.elementsByAccessibilityId('ComputeSumButton');
    assert.equal(computeSumButtons.length, 1);
    await computeSumButtons[0].click();
  });

  it('should find elements by class name', async function () {
    // Find element by name
    const windowElements = await driver.elementsByClassName('XCUIElementTypeWindow');
    assert.isAbove(windowElements.length, 1);
  });

  it('should find elements by NSPredicateString', async function () {
    // This is an IOS-specific selector strategy. See https://developer.apple.com/library/content/documentation/Cocoa/Conceptual/Predicates/Articles/pSyntax.html for reference
    const allVisibleElements = await driver.elements('-ios predicate string', 'visible = 1');
    assert.isAbove(allVisibleElements.length, 1);
  });

  it('should find elements by class chain', async function () {
    // This is also an IOS-specific selector strategy. Similar to XPath. This is recommended over XPath.
    const windowElement = await driver.elements('-ios class chain', 'XCUIElementTypeWindow[1]/*');
    assert.equal(windowElement.length, 3);
  });

  it('should find elements by XPath', async function () {
    // Can find source xml by calling `driver.source()`
    // Note that XPath is not recommended due to major performance issues
    const buttons = await driver.elementsByXPath('//XCUIElementTypeWindow//XCUIElementTypeButton');
    assert.isAbove(buttons.length, 1, 'Should have more than one button');
  });
});
