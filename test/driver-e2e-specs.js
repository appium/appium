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

describe('FakeDriver - via HTTP', () => {
  let server = null;
  before(async () => {
    if (shouldStartServer) {
      let args = {port: TEST_PORT, host: TEST_HOST};
      server = await appiumServer(args);
    }
  });
  after(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('session handling', () => {
    it('should start and stop a session', async () => {
      let driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId] = await driver.init(caps);
      should.exist(sessionId);
      sessionId.should.be.a('string');
      await driver.quit();
      await driver.title().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should be able to run two FakeDriver sessions simultaneously', async () => {
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

    it('should not be able to run two FakeDriver sessions simultaneously when one is unique', async () => {
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

    it('should use the newCommandTimeout of the inner Driver on session creation', async () => {
      let driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);

      caps.newCommandTimeout = 0.25;

      let [sessionId] = await driver.init(caps);
      should.exist(sessionId);

      await B.delay(250);
      await driver.source().should.eventually.be.rejectedWith(/terminated/);
    });

    it('should accept W3C capabilities', async () => {
      // Try with valid capabilities and check that it returns a session ID
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {platformName: 'Fake'},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      const { status, value, sessionId } = await request.post({url: `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`, json: w3cCaps});
      status.should.equal(0);
      sessionId.should.be.a.string;
      value.should.exist;

      // Now use that sessionId to call /screenshot
      const { status:screenshotStatus, value:screenshotValue } = await request({url: `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session/${sessionId}/screenshot`, json: true});
      screenshotValue.should.equal('hahahanotreallyascreenshot');
      screenshotStatus.should.equal(0);

      // Now use that sessionID to call an arbitrary W3C-only endpoint that isn't implemented to see if it throws correct error
      await request.post({url: `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session/${sessionId}/execute/async`, json: {script: '', args: ['a']}}).should.eventually.be.rejectedWith(/not yet been implemented/);

      // Now try with invalid capabilities and check that it returns 500 status
      const badW3Ccaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        }
      };

      try {
        await request.post({url: `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`, json: badW3Ccaps});
      } catch (e) {
        e.statusCode.should.equal(500);
      }
    });
  });
});

describe('Logsink', () => {
  let server = null;
  let logs = [];
  let logHandler = (level, message) => {
    logs.push([level, message]);
  };
  let args = {port: TEST_PORT, host: TEST_HOST, logHandler};

  before(async () => {
    server = await appiumServer(args);
  });

  after(async () => {
    await server.close();
  });

  it('should send logs to a logHandler passed in by a parent package', async () => {
    logs.length.should.be.above(1);
    logs[0].length.should.equal(2);
    logs[0][1].should.include("Welcome to Appium");
  });

});
