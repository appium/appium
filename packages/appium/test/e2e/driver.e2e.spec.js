// @ts-check

import {BaseDriver} from '@appium/base-driver';
import {fs, tempDir} from '@appium/support';
import axios from 'axios';
import B from 'bluebird';
import _ from 'lodash';
import {createSandbox} from 'sinon';
import {remote as wdio} from 'webdriverio';
import {runExtensionCommand} from '../../lib/cli/extension';
import {DRIVER_TYPE} from '../../lib/constants';
import {loadExtensions} from '../../lib/extension';
import {INSTALL_TYPE_LOCAL} from '../../lib/extension/extension-config';
import {main as appiumServer} from '../../lib/main';
import {removeAppiumPrefixes} from '../../lib/utils';
import {
  FAKE_DRIVER_DIR,
  getTestPort,
  TEST_FAKE_APP,
  TEST_HOST,
  W3C_PREFIXED_CAPS,
} from '../helpers';

const should = chai.should();

/** @type {string} */
let testServerBaseUrl;

/** @type {number} */
let port;

const sillyWebServerPort = 1234;
const sillyWebServerHost = 'hey';
const FAKE_ARGS = {sillyWebServerPort, sillyWebServerHost};
const FAKE_DRIVER_ARGS = {driver: {fake: FAKE_ARGS}};
const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';
const caps = W3C_PREFIXED_CAPS;

/** @type {Partial<import('webdriverio').RemoteOptions>} */
const wdOpts = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
};

describe('FakeDriver via HTTP', function () {
  /** @type {AppiumServer} */
  let server;
  /** @type {string} */
  let appiumHome;
  // since we update the FakeDriver.prototype below, make sure we update the FakeDriver which is
  // actually going to be required by Appium
  /** @type {import('@appium/types').DriverClass} */
  let FakeDriver;
  /** @type {string} */
  let testServerBaseSessionUrl;

  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  before(async function () {
    sandbox = createSandbox();
    appiumHome = await tempDir.openDir();
    wdOpts.port = port = await getTestPort();
    testServerBaseUrl = `http://${TEST_HOST}:${port}`;
    testServerBaseSessionUrl = `${testServerBaseUrl}/session`;
    // first ensure we have fakedriver installed
    const {driverConfig} = await loadExtensions(appiumHome);
    const driverList = await runExtensionCommand(
      {
        driverCommand: 'list',
        subcommand: DRIVER_TYPE,
        suppressOutput: true,
        showInstalled: true,
      },
      driverConfig
    );
    if (!_.has(driverList, 'fake')) {
      await runExtensionCommand(
        {
          driverCommand: 'install',
          driver: FAKE_DRIVER_DIR,
          installType: INSTALL_TYPE_LOCAL,
          subcommand: DRIVER_TYPE,
        },
        driverConfig
      );
    }

    FakeDriver = driverConfig.require('fake');
    // then start server if we need to
    await serverStart(port, {appiumHome});
  });

  after(async function () {
    await serverClose();
    await fs.rimraf(appiumHome);
    sandbox.restore();
  });

  /**
   *
   * @param {number} port
   * @param {Partial<import('appium/types').ParsedArgs>} [args]
   */
  async function serverStart(port, args = {}) {
    args = {...args, port, address: TEST_HOST};
    if (shouldStartServer) {
      server = await appiumServer(args);
    }
  }

  async function serverClose() {
    if (server) {
      await server.close();
    }
  }

  describe('server updating', function () {
    it('should allow drivers to update the server in arbitrary ways', async function () {
      const {data} = await axios.get(`${testServerBaseUrl}/fakedriver`);
      data.should.eql({fakedriver: 'fakeResponse'});
    });
    it('should update the server with cliArgs', async function () {
      // we don't need to check the entire object, since it's large, but we can ensure an
      // arg got through.
      (await axios.post(`http://${TEST_HOST}:${port}/fakedriverCliArgs`)).data.should.have.property(
        'appiumHome',
        appiumHome
      );
    });
  });

  describe('cli args handling for empty args', function () {
    it('should not recieve user cli args if none passed in', async function () {
      let driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriverargs`);
        should.not.exist(data.value.sillyWebServerPort);
        should.not.exist(data.value.sillyWebServerHost);
      } finally {
        await driver.deleteSession();
      }
    });
  });

  describe('cli args handling for passed in args', function () {
    before(async function () {
      await serverClose();
      await serverStart(port, {appiumHome, ...FAKE_DRIVER_ARGS});
    });
    after(async function () {
      await serverClose();
      // this weirdness here is to restart the same server which was originally started in the parent suite's
      // "before all" hook.  another way of doing this would be to just...not nest suites this way.
      await serverStart(port, {appiumHome});
    });
    it('should receive user cli args from a driver if arguments were passed in', async function () {
      let driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriverargs`);
        data.value.sillyWebServerPort.should.eql(sillyWebServerPort);
        data.value.sillyWebServerHost.should.eql(sillyWebServerHost);
      } finally {
        await driver.deleteSession();
      }
    });
  });

  describe('session handling', function () {
    it('should start and stop a session and not allow commands after session stopped', async function () {
      let driver = await wdio({...wdOpts, capabilities: caps});
      should.exist(driver.sessionId);
      driver.sessionId.should.be.a('string');
      await driver.deleteSession();
      await driver.getTitle().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should be able to run two FakeDriver sessions simultaneously', async function () {
      let driver1 = await wdio({...wdOpts, capabilities: caps});
      should.exist(driver1.sessionId);
      driver1.sessionId.should.be.a('string');
      let driver2 = await wdio({...wdOpts, capabilities: caps});
      should.exist(driver2.sessionId);
      driver2.sessionId.should.be.a('string');
      driver2.sessionId.should.not.equal(driver1.sessionId);
      await driver1.deleteSession();
      await driver2.deleteSession();
    });

    it('should not be able to run two FakeDriver sessions simultaneously when one is unique', async function () {
      let uniqueCaps = _.clone(caps);
      uniqueCaps['appium:uniqueApp'] = true;
      let driver1 = await wdio({...wdOpts, capabilities: uniqueCaps});
      should.exist(driver1.sessionId);
      driver1.sessionId.should.be.a('string');
      await wdio({...wdOpts, capabilities: caps}).should.eventually.be.rejected;
      await driver1.deleteSession();
    });

    it('should use the newCommandTimeout of the inner Driver on session creation', async function () {
      let localCaps = Object.assign(
        {
          'appium:newCommandTimeout': 0.25,
        },
        caps
      );
      let driver = await wdio({...wdOpts, capabilities: localCaps});
      should.exist(driver.sessionId);

      await B.delay(250);
      await driver.getPageSource().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should accept valid W3C capabilities and start a W3C session', async function () {
      // Try with valid capabilities and check that it returns a session ID
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {'appium:automationName': 'Fake', platformName: 'Fake'},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        },
      };

      // Create the session
      const {status, value, sessionId} = (await axios.post(testServerBaseSessionUrl, w3cCaps)).data;
      try {
        should.not.exist(status); // Test that it's a W3C session by checking that 'status' is not in the response
        should.not.exist(sessionId);
        value.sessionId.should.be.a.string;
        value.should.exist;
        value.capabilities.should.deep.equal({
          automationName: 'Fake',
          platformName: 'Fake',
          deviceName: 'Fake',
          app: TEST_FAKE_APP,
        });

        // Now use that sessionId to call /screenshot
        const {status: screenshotStatus, value: screenshotValue} = (
          await axios({
            url: `${testServerBaseSessionUrl}/${value.sessionId}/screenshot`,
          })
        ).data;
        should.not.exist(screenshotStatus);
        screenshotValue.should.match(/^iVBOR/); // should be a png

        // Now use that sessionID to call an arbitrary W3C-only endpoint that isn't implemented to see if it responds with correct error
        await axios
          .post(`${testServerBaseSessionUrl}/${value.sessionId}/execute/async`, {
            script: '',
            args: ['a'],
          })
          .should.eventually.be.rejectedWith(/405/);
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should reject invalid W3C capabilities and respond with a 400 Bad Parameters error', async function () {
      const badW3Ccaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        },
      };

      await axios
        .post(testServerBaseSessionUrl, badW3Ccaps)
        .should.eventually.be.rejectedWith(/400/);
    });

    it('should accept a combo of W3C and JSONWP capabilities but completely ignore JSONWP', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
          jsonwpParam: 'jsonwpParam',
        },
        capabilities: {
          alwaysMatch: {...caps},
          firstMatch: [
            {
              'appium:w3cParam': 'w3cParam',
            },
          ],
        },
      };

      const {status, value, sessionId} = (await axios.post(testServerBaseSessionUrl, combinedCaps))
        .data;
      try {
        should.not.exist(status); // If it's a W3C session, should not respond with 'status'
        should.not.exist(sessionId);
        value.sessionId.should.exist;
        value.capabilities.should.deep.equal({
          ...removeAppiumPrefixes(caps),
          w3cParam: 'w3cParam',
        });
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should reject bad automation name with an appropriate error', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {
            ...caps,
            'appium:automationName': 'BadAutomationName',
          },
        },
      };
      await axios.post(testServerBaseSessionUrl, w3cCaps).should.eventually.be.rejectedWith(/500/);
    });

    it('should accept capabilities that are provided in the firstMatch array', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [
            {},
            {
              ...caps,
            },
          ],
        },
      };
      const {value, sessionId, status} = (await axios.post(testServerBaseSessionUrl, w3cCaps)).data;
      try {
        should.not.exist(status);
        should.not.exist(sessionId);
        value.capabilities.should.deep.equal(removeAppiumPrefixes(caps));
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should not fall back to MJSONWP if w3c caps are invalid', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {},
          firstMatch: [
            {},
            {
              ...caps,
              platformName: null,
              'appium:automationName': null,
              'appium:deviceName': null,
            },
          ],
        },
      };
      const res = await axios.post(testServerBaseSessionUrl, combinedCaps, {
        validateStatus: null,
      });
      res.status.should.eql(400);
      res.data.value.error.should.match(/invalid argument/);
    });

    it('should not fall back to MJSONWP even if Inner Driver is not ready for W3C', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {
            ...caps,
            'appium:deviceName': 'Fake',
          },
        },
      };
      const createSessionStub = sandbox
        .stub(FakeDriver.prototype, 'createSession')
        .callsFake(async function (jsonwpCaps) {
          const res = await BaseDriver.prototype.createSession.call(this, jsonwpCaps);
          this.protocol.should.equal('MJSONWP');
          return res;
        });

      const res = await axios.post(testServerBaseSessionUrl, combinedCaps, {
        validateStatus: null,
      });
      const {data, status} = res;
      status.should.eql(500);
      data.value.message.should.match(/older capabilities/);

      createSessionStub.restore();
    });

    it('should allow drivers to update the method map with new routes and commands', async function () {
      let driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fakedriver`, {
          thing: {yes: 'lolno'},
        });
        (
          await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriver`)
        ).data.value.should.eql({yes: 'lolno'});
      } finally {
        await driver.deleteSession();
      }
    });
  });
});

// TODO this test only works if the log has not previously been initialized in the same process.
// there seems to be some global state that is not cleaned up between tests.
describe.skip('Logsink', function () {
  let server = null;
  let logs = [];
  let logHandler = function (level, message) {
    logs.push([level, message]);
  };
  let args = {
    port,
    address: TEST_HOST,
    logHandler,
  };

  before(async function () {
    server = /** @type {AppiumServer} */ (await appiumServer(args));
  });

  after(async function () {
    await server.close();
  });

  it('should send logs to a logHandler passed in by a parent package', function () {
    logs.length.should.be.above(1);
    let welcomeIndex = logs[0][1].includes('versions of node') ? 1 : 0;
    logs[welcomeIndex].length.should.equal(2);
    logs[welcomeIndex][1].should.include('Welcome to Appium');
  });
});

/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 */
