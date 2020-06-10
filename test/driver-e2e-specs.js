// transpile:mocha

import _ from 'lodash';
import B from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import wd from 'wd';
import axios from 'axios';
import { main as appiumServer } from '../lib/main';
import { DEFAULT_APPIUM_HOME, INSTALL_TYPE_NPM } from '../lib/driver-config';
import { TEST_FAKE_APP, TEST_HOST, TEST_PORT } from './helpers';
import { BaseDriver } from 'appium-base-driver';
import { FakeDriver } from 'appium-fake-driver';
import { runDriverCommand } from '../lib/cli/driver';
import sinon from 'sinon';

chai.use(chaiAsPromised);

const should = chai.should();
const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';
const caps = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP
};

describe('FakeDriver - via HTTP', function () {
  let server = null;
  const appiumHome = DEFAULT_APPIUM_HOME;
  const baseUrl = `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`;
  before(async function () {
    // first ensure we have fakedriver installed
    const driverList = await runDriverCommand({
      appiumHome,
      driverCommand: 'list',
      showInstalled: true,
    });
    if (!_.has(driverList, 'fake')) {
      await runDriverCommand({
        appiumHome,
        driverCommand: 'install',
        driver: 'appium-fake-driver',
        installType: INSTALL_TYPE_NPM,
      });
    }

    // then start server if we need to
    if (shouldStartServer) {
      let args = {port: TEST_PORT, host: TEST_HOST, appiumHome};
      server = await appiumServer(args);
    }
  });

  after(async function () {
    if (server) {
      await server.close();
    }
  });

  describe('session handling', function () {
    it('should start and stop a session', async function () {
      let driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId] = await driver.init(caps);
      should.exist(sessionId);
      sessionId.should.be.a('string');
      await driver.quit();
      await driver.title().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should be able to run two FakeDriver sessions simultaneously', async function () {
      let driver1 = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId1] = await driver1.init(caps);
      should.exist(sessionId1);
      sessionId1.should.be.a('string');
      let driver2 = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId2] = await driver2.init(caps);
      should.exist(sessionId2);
      sessionId2.should.be.a('string');
      sessionId1.should.not.equal(sessionId2);
      await driver1.quit();
      await driver2.quit();
    });

    it('should not be able to run two FakeDriver sessions simultaneously when one is unique', async function () {
      let uniqueCaps = _.clone(caps);
      uniqueCaps.uniqueApp = true;
      let driver1 = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId1] = await driver1.init(uniqueCaps);
      should.exist(sessionId1);
      sessionId1.should.be.a('string');
      let driver2 = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      await driver2.init(caps).should.eventually.be.rejected;
      await driver1.quit();
    });

    it('should use the newCommandTimeout of the inner Driver on session creation', async function () {
      let driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);

      let localCaps = Object.assign({
        newCommandTimeout: 0.25,
      }, caps);

      let [sessionId] = await driver.init(localCaps);
      should.exist(sessionId);

      await B.delay(250);
      await driver.source().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should accept valid W3C capabilities and start a W3C session', async function () {
      // Try with valid capabilities and check that it returns a session ID
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {automationName: 'Fake', platformName: 'Fake'},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      // Create the session
      const {status, value, sessionId} = (await axios.post(baseUrl, w3cCaps)).data;
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
      const {status: screenshotStatus, value: screenshotValue} = (await axios({url: `${baseUrl}/${value.sessionId}/screenshot`})).data;
      should.not.exist(screenshotStatus);
      screenshotValue.should.equal('hahahanotreallyascreenshot');

      // Now use that sessionID to call an arbitrary W3C-only endpoint that isn't implemented to see if it responds with correct error
      await axios.post(
        `${baseUrl}/${value.sessionId}/execute/async`,
        {script: '', args: ['a']}).should.eventually.be.rejectedWith(/405/);

      // End session
      await axios.delete(`${baseUrl}/${value.sessionId}`);
    });

    it('should reject invalid W3C capabilities and respond with a 400 Bad Parameters error', async function () {
      const badW3Ccaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      await axios.post(baseUrl, badW3Ccaps).should.eventually.be.rejectedWith(/400/);
    });

    it('should accept a combo of W3C and JSONWP capabilities but default to W3C', async function () {
      const combinedCaps = {
        'desiredCapabilities': {
          ...caps,
        },
        'capabilities': {
          'alwaysMatch': {...caps},
          'firstMatch': [{
            w3cParam: 'w3cParam',
          }],
        }
      };

      const {status, value, sessionId} = (await axios.post(baseUrl, combinedCaps)).data;
      should.not.exist(status); // If it's a W3C session, should not respond with 'status'
      should.not.exist(sessionId);
      value.sessionId.should.exist;
      value.capabilities.should.deep.equal({
        ...caps,
        w3cParam: 'w3cParam',
      });

      // End session
      await axios.delete(`${baseUrl}/${value.sessionId}`);
    });

    it('should accept a combo of W3C and JSONWP and if JSONWP has extraneous keys, they should be merged into W3C capabilities', async function () {
      const combinedCaps = {
        'desiredCapabilities': {
          ...caps,
          automationName: 'Fake',
          anotherParam: 'Hello',
        },
        'capabilities': {
          'alwaysMatch': {...caps},
          'firstMatch': [{
            w3cParam: 'w3cParam',
          }],
        }
      };

      const {sessionId, status, value} = (await axios.post(baseUrl, combinedCaps)).data;
      should.not.exist(sessionId);
      should.not.exist(status);
      value.sessionId.should.exist;
      value.capabilities.should.deep.equal({
        ...caps,
        automationName: 'Fake',
        anotherParam: 'Hello',
        w3cParam: 'w3cParam',
      });

      // End session
      await axios.delete(`${baseUrl}/${value.sessionId}`);
    });

    it('should reject bad automation name with an appropriate error', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {
            ...caps,
            automationName: 'BadAutomationName',
          },
        },
      };
      await axios.post(baseUrl, w3cCaps).should.eventually.be.rejectedWith(/500/);
    });

    it('should accept capabilities that are provided in the firstMatch array', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{}, {
            ...caps
          }],
        },
      };
      const {value, sessionId, status} = (await axios.post(baseUrl, w3cCaps)).data;
      should.not.exist(status);
      should.not.exist(sessionId);
      value.capabilities.should.deep.equal(caps);

      // End session
      await axios.delete(`${baseUrl}/${value.sessionId}`);
    });

    it('should fall back to MJSONWP if w3c caps are invalid', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{}, {
            ...caps,
            platformName: null,
            automationName: null,
            deviceName: null,
          }],
        },
      };
      const {value, sessionId, status} = (await axios.post(baseUrl, combinedCaps)).data;
      status.should.exist;
      sessionId.should.exist;
      value.should.deep.equal(caps);

      // End session
      await axios.delete(`${baseUrl}/${sessionId}`);
    });

    it('should fall back to MJSONWP if Inner Driver is not ready for W3C', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {
            ...caps,
            deviceName: 'Fake',
          },
        },
      };
      const createSessionStub = sinon.stub(FakeDriver.prototype, 'createSession').callsFake(async function (jsonwpCaps) {
        const res = await BaseDriver.prototype.createSession.call(this, jsonwpCaps);
        this.protocol.should.equal('MJSONWP');
        return res;
      });

      const {value} = (await axios.post(baseUrl, combinedCaps)).data;
      const {capabilities, sessionId} = value;
      sessionId.should.exist;
      capabilities.should.deep.equal(caps);

      createSessionStub.restore();

      // End session
      await axios.delete(`${baseUrl}/${sessionId}`);
    });

    it('should handle concurrent MJSONWP and W3C sessions', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {
            ...caps,
          },
          firstMatch: [],
        },
      };

      // Have an MJSONWP and W3C session running concurrently
      const {sessionId: mjsonwpSessId, value: mjsonwpValue, status} = (await axios.post(baseUrl, _.omit(combinedCaps, 'capabilities'))).data;
      status.should.exist;
      mjsonwpValue.should.eql(caps);
      mjsonwpSessId.should.exist;

      const {value} = (await axios.post(baseUrl, _.omit(combinedCaps, 'desiredCapabilities'))).data;
      const w3cSessId = value.sessionId;
      w3cSessId.should.exist;
      value.capabilities.should.eql(caps);

      // Test that both return the proper payload based on their protocol
      const mjsonwpPayload = (await axios.get(`${baseUrl}/${mjsonwpSessId}`)).data;
      mjsonwpPayload.sessionId.should.exist;
      mjsonwpPayload.status.should.exist;
      mjsonwpPayload.value.should.eql(caps);

      const w3cPayload = (await axios.get(`${baseUrl}/${w3cSessId}`)).data;
      should.not.exist(w3cPayload.sessionId);
      should.not.exist(w3cPayload.status);
      w3cPayload.value.should.eql(caps);

      // End sessions
      await axios.delete(`${baseUrl}/${mjsonwpSessId}`);
      await axios.delete(`${baseUrl}/${w3cSessId}`);
    });
  });
});

describe('Logsink', function () {
  let server = null;
  let logs = [];
  let logHandler = function (level, message) {
    logs.push([level, message]);
  };
  let args = {
    port: TEST_PORT,
    host: TEST_HOST,
    appiumHome: DEFAULT_APPIUM_HOME,
    logHandler,
  };

  before(async function () {
    server = await appiumServer(args);
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
