import sinon from 'sinon';
import RelaxedCapsPlugin from '../../lib/plugin';

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

  describe('#transformCaps', function () {
    it('should not transform standard caps', function () {
      rcp.transformCaps(STD_CAPS).should.eql(STD_CAPS);
    });
    it('should transform non-standard caps', function () {
      rcp.transformCaps(MIXED_CAPS).should.eql(ADJUSTED_CAPS);
    });
    it('should not transform already prefixed caps', function () {
      rcp.transformCaps(VENDOR_CAPS).should.eql(ADJUSTED_VENDOR_CAPS);
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

    it('should work with multiple firstMatch', async function () {
      const mock = sandbox.mock(driver);
      const w3c = {firstMatch: [MIXED_CAPS, STD_CAPS, MIXED_CAPS]};
      const w3cAdjusted = {
        firstMatch: [ADJUSTED_CAPS, STD_CAPS, ADJUSTED_CAPS],
      };
      mock.expects('createSession').once().withExactArgs(null, null, w3cAdjusted);
      await rcp.createSession(next, driver, null, null, w3c);
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
