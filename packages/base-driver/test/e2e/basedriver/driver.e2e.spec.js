import {BaseDriver, server, routeConfiguringFunction, PREFIXED_APPIUM_OPTS_CAP} from '../../../lib';
import {
  driverE2ETestSuite,
  getTestPort,
  TEST_HOST,
  createSessionHelpers,
} from '@appium/test-support';

const {expect} = chai;

const DEFAULT_CAPS = {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
};

driverE2ETestSuite(BaseDriver, DEFAULT_CAPS);

describe('BaseDriver', function () {
  // only run this test on basedriver, not other drivers which also use these tests, since we
  // don't want them to try and start sessions with these random capabilities that are
  // necessary to test the appium options logic
  describe('special appium:options capability', function () {
    /** @type {SessionHelpers['startSession']} */
    let startSession;
    /** @type {SessionHelpers['endSession']} */
    let endSession;
    /** @type {import('@appium/types').AppiumServer} */
    let baseServer;
    /** @type {BaseDriver} */
    let d;

    before(async function () {
      const port = await getTestPort();
      d = new BaseDriver({port, address: TEST_HOST});
      baseServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(d),
        port,
        hostname: TEST_HOST,
      });

      ({startSession, endSession} = createSessionHelpers(port));
    });

    after(async function () {
      await baseServer.close();
    });

    it('should be able to start a session with caps held in appium:options', async function () {
      const ret = await startSession({
        capabilities: {
          alwaysMatch: {
            platformName: 'iOS',
            [PREFIXED_APPIUM_OPTS_CAP]: {
              platformVersion: '11.4',
              'appium:deviceName': 'iPhone 11',
            },
          },
        },
      });
      try {
        expect(d.opts.platformVersion).to.equal('11.4');
        expect(d.opts.deviceName).to.equal('iPhone 11');
      } finally {
        await endSession(ret.sessionId);
      }
    });
  });
});

/**
 * @typedef {import('@appium/test-support').SessionHelpers} SessionHelpers
 */
