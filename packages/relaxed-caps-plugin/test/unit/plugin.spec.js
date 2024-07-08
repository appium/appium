import sinon from 'sinon';
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
  let sandbox;
  let should;

  before(async function () {
    const chai = await import('chai');
    should = chai.should();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  const rcp = new RelaxedCapsPlugin();

  it('should export the name', function () {
    should.exist(RelaxedCapsPlugin);
  });

  describe('#fixCapsIfW3C', function () {
    it('should not transform standard caps', function () {
      rcp.fixCapsIfW3C({alwaysMatch: STD_CAPS}).should.eql({alwaysMatch: STD_CAPS});
    });
    it('should transform non-standard caps', function () {
      rcp.fixCapsIfW3C({alwaysMatch: MIXED_CAPS}).should.eql({alwaysMatch: ADJUSTED_CAPS});
    });
    it('should not transform already prefixed caps', function () {
      rcp.fixCapsIfW3C({firstMatch: [VENDOR_CAPS], alwaysMatch: VENDOR_CAPS})
        .should.eql({firstMatch: [ADJUSTED_VENDOR_CAPS], alwaysMatch: ADJUSTED_VENDOR_CAPS});
    });
    it('should not transform non-W3C caps', function () {
      rcp.fixCapsIfW3C({desiredCapabilities: VENDOR_CAPS})
        .should.eql({desiredCapabilities: VENDOR_CAPS});
    });
  });

  describe('#createSession', function () {
    const next = () => {};
    const driver = {createSession: () => {}};

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
