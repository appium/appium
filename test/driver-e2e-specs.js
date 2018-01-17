// transpile:mocha

import _ from 'lodash';
import B from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import wd from 'wd';
import request from 'request-promise';
import { main as appiumServer } from '../lib/main';
import { TEST_FAKE_APP, TEST_HOST, TEST_PORT } from './helpers';

chai.use(chaiAsPromised);

const should = chai.should();
const shouldStartServer = process.env.USE_RUNNING_SERVER !== "0";
const caps = {platformName: "Fake", deviceName: "Fake", app: TEST_FAKE_APP};

describe('FakeDriver - via HTTP', function () {
  let server = null;
  const baseUrl = `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`;
  before(async function () {
    if (shouldStartServer) {
      let args = {port: TEST_PORT, host: TEST_HOST};
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

      caps.newCommandTimeout = 0.25;

      let [sessionId] = await driver.init(caps);
      should.exist(sessionId);

      await B.delay(250);
      await driver.source().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should accept valid W3C capabilities and start a W3C session', async function () {
      // Try with valid capabilities and check that it returns a session ID
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {platformName: 'Fake'},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      // Create the session
      const {status, value, sessionId} = await request.post({url: baseUrl, json: w3cCaps});
      should.not.exist(status); // Test that it's a W3C session by checking that 'status' is not in the response
      should.not.exist(sessionId);
      value.sessionId.should.be.a.string;
      value.should.exist;
      value.capabilities.should.deep.equal({
        platformName: 'Fake',
        deviceName: 'Fake',
        app: TEST_FAKE_APP,
      });

      // Now use that sessionId to call /screenshot
      const {status:screenshotStatus, value:screenshotValue} = await request({url: `${baseUrl}/${value.sessionId}/screenshot`, json: true});
      should.not.exist(screenshotStatus);
      screenshotValue.should.equal('hahahanotreallyascreenshot');

      // Now use that sessionID to call an arbitrary W3C-only endpoint that isn't implemented to see if it responds with correct error
      const {statusCode, message} = await request.post({url: `${baseUrl}/${value.sessionId}/execute/async`, json: {script: '', args: ['a']}}).should.eventually.be.rejected;
      statusCode.should.equal(404);
      message.should.match(/Method has not yet been implemented/);

      // End session
      await request.delete({url: `${baseUrl}/${value.sessionId}`}).should.eventually.be.resolved;
    });

    it('should reject invalid W3C capabilities and respond with a 400 Bad Parameters error', async function () {
      const badW3Ccaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      const {statusCode, message} = await request.post({url: baseUrl, json: badW3Ccaps}).should.eventually.be.rejected;
      statusCode.should.equal(400);
      message.should.match(/can't be blank/);
    });

    it('should accept a combo of W3C and JSONWP capabilities but default to W3C', async function () {
      const combinedCaps = {
        "desiredCapabilities": {
          ...caps,
          mjsonwpParam: 'mjsonwpParam',
        },
        "capabilities": {
          "alwaysMatch": {...caps},
          "firstMatch": [{
            w3cParam: 'w3cParam',
          }],
        }
      };

      const {status, value, sessionId} = await request.post({url: baseUrl, json: combinedCaps});
      should.not.exist(status); // If it's a W3C session, should not respond with 'status'
      should.not.exist(sessionId);
      value.sessionId.should.exist;
      value.capabilities.should.deep.equal({
        ...caps,
        w3cParam: 'w3cParam',
        mjsonwpParam: 'mjsonwpParam', // Note: For now we're accepting a mix of the two to alleviate client issues. This ought to not be supported in the future though.
      });
    });

    it('should reject bad W3C capabilities with a BadParametersError (400)', async function () {
      const w3cCaps = {
        "capabilities": {
          "alwaysMatch": {
            ...caps,
            "automationName": "BadAutomationName",
          }
        },
      };
      const {message, statusCode} = await request.post({url: baseUrl, json: w3cCaps}).should.eventually.be.rejected;
      message.should.match(/BadAutomationName not part of/);
      statusCode.should.equal(400);
    });

    it('should accept capabilities that are provided in the firstMatch array', async function () {
      const w3cCaps = {
        "capabilities": {
          "alwaysMatch": {},
          "firstMatch": [{}, {
            ...caps
          }],
        },
      };
      const {value, sessionId, status} = await request.post({url: baseUrl, json: w3cCaps});
      should.not.exist(status);
      should.not.exist(sessionId);
      value.capabilities.should.deep.equal(caps);
    });
  });
});

describe('Logsink', function () {
  let server = null;
  let logs = [];
  let logHandler = (level, message) => {
    logs.push([level, message]);
  };
  let args = {port: TEST_PORT, host: TEST_HOST, logHandler};

  before(async function () {
    server = await appiumServer(args);
  });

  after(async function () {
    await server.close();
  });

  it('should send logs to a logHandler passed in by a parent package', async function () {
    logs.length.should.be.above(1);
    logs[0].length.should.equal(2);
    logs[0][1].should.include("Welcome to Appium");
  });

});
