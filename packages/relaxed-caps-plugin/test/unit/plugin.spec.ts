import sinon from 'sinon';
import {expect} from 'chai';
import {RelaxedCapsPlugin} from '../../lib/plugin';

const STD_CAPS = {
  browserName: 'chrome',
  browserVersion: '89',
  platformName: 'Windows',
};

const MIXED_CAPS = {
  browserName: 'chrome',
  browserVersion: '89',
  platformName: 'Windows',
  automationName: 'XCUITest',
  wdaLaunchTimeout: 12000,
};

const ADJUSTED_CAPS = {
  browserName: 'chrome',
  browserVersion: '89',
  platformName: 'Windows',
  'appium:automationName': 'XCUITest',
  'appium:wdaLaunchTimeout': 12000,
};

const VENDOR_CAPS = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'otherVendor:deviceName': 'iPhone 500',
  platformVersion: 3,
};

const ADJUSTED_VENDOR_CAPS = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'otherVendor:deviceName': 'iPhone 500',
  'appium:platformVersion': 3,
};

describe('relaxed caps plugin', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  const rcp = new RelaxedCapsPlugin('relaxed-caps');

  it('should export the name', function () {
    expect(RelaxedCapsPlugin).to.exist;
  });

  describe('#fixCapsIfW3C', function () {
    // Bracket notation required to call private method in tests
    /* eslint-disable dot-notation */
    it('should not transform standard caps', function () {
      expect(rcp['fixCapsIfW3C']({alwaysMatch: STD_CAPS})).to.eql({alwaysMatch: STD_CAPS});
    });
    it('should transform non-standard caps', function () {
      expect(rcp['fixCapsIfW3C']({alwaysMatch: MIXED_CAPS})).to.eql({alwaysMatch: ADJUSTED_CAPS});
    });
    it('should not transform already prefixed caps', function () {
      expect(
        rcp['fixCapsIfW3C']({firstMatch: [VENDOR_CAPS], alwaysMatch: VENDOR_CAPS})
      ).to.eql({firstMatch: [ADJUSTED_VENDOR_CAPS], alwaysMatch: ADJUSTED_VENDOR_CAPS});
    });
    it('should not transform non-W3C caps', function () {
      expect(rcp['fixCapsIfW3C']({desiredCapabilities: VENDOR_CAPS})).to.eql({
        desiredCapabilities: VENDOR_CAPS,
      });
    });
    /* eslint-enable dot-notation */
  });

  describe('#createSession', function () {
    const next = () => Promise.resolve();
    const driver = {createSession: () => Promise.resolve()};

    it('should work with W3C style caps format', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {firstMatch: [MIXED_CAPS]};
      const w3cAdjusted = {firstMatch: [ADJUSTED_CAPS]};
      mock.expects('createSession').once().withExactArgs(null, null, w3cAdjusted);
      await rcp.createSession(next, driver, null, null, w3c);
      mock.verify();
    });

    it('should work with any argument', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {firstMatch: [MIXED_CAPS]};
      const w3cAdjusted = {firstMatch: [ADJUSTED_CAPS]};
      mock.expects('createSession').once().withExactArgs(w3cAdjusted, w3cAdjusted, null);
      await rcp.createSession(next, driver, w3c, w3c, null);
      mock.verify();
    });

    it('should work with multiple firstMatch', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {firstMatch: [MIXED_CAPS, STD_CAPS, MIXED_CAPS]};
      const w3cAdjusted = {
        firstMatch: [ADJUSTED_CAPS, STD_CAPS, ADJUSTED_CAPS],
      };
      mock.expects('createSession').once().withExactArgs(null, {}, w3cAdjusted);
      await rcp.createSession(next, driver, null, {}, w3c);
      mock.verify();
    });

    it('should work with alwaysMatch', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {alwaysMatch: MIXED_CAPS};
      const w3cAdjusted = {alwaysMatch: ADJUSTED_CAPS};
      mock.expects('createSession').once().withExactArgs(null, null, w3cAdjusted);
      await rcp.createSession(next, driver, null, null, w3c);
      mock.verify();
    });

    it('should work with alwaysMatch and firstMatch', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {alwaysMatch: MIXED_CAPS, firstMatch: [MIXED_CAPS]};
      const w3cAdjusted = {
        alwaysMatch: ADJUSTED_CAPS,
        firstMatch: [ADJUSTED_CAPS],
      };
      mock.expects('createSession').once().withExactArgs(null, null, w3cAdjusted);
      await rcp.createSession(next, driver, null, null, w3c);
      mock.verify();
    });
  });
});
