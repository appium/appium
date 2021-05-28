// transpile:mocha

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import wd from 'wd';
import axios from 'axios';
import { baseDriverE2ETests } from '@appium/base-driver/build/test/basedriver';
import { FakeDriver, startServer } from '..';
import { DEFAULT_CAPS, TEST_HOST, TEST_PORT } from './helpers';
import contextTests from './context-tests';
import findElementTests from './find-element-tests';
import elementInteractionTests from './element-interaction-tests';
import alertTests from './alert-tests';
import generalTests from './general-tests';


const should = chai.should();
chai.use(chaiAsPromised);
const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';

// test the same things as for base driver
baseDriverE2ETests(FakeDriver, DEFAULT_CAPS);

describe('FakeDriver - via HTTP', function () {
  let server = null;
  before(async function () {
    if (shouldStartServer) {
      server = await startServer(TEST_PORT, TEST_HOST);
    }
  });
  after(function () {
    if (server) {
      server.close();
    }
  });

  describe('session handling', function () {
    it('should start and stop a session', async function () {
      let driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      let [sessionId] = await driver.init(DEFAULT_CAPS);
      should.exist(sessionId);
      sessionId.should.be.a('string');
      await driver.quit();
      await driver.title().should.eventually.be.rejectedWith(/terminated/);
    });

  });

  describe('session-based tests', function () {
    contextTests();
    findElementTests();
    elementInteractionTests();
    alertTests();
    generalTests();
  });

  describe('w3c', function () {
    it('should return value.capabilities object for W3C', async function () {
      const res = await axios.post(`http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`, {
        capabilities: {
          alwaysMatch: DEFAULT_CAPS,
          firstMatch: [{
            'appium:fakeCap': 'Foo',
          }],
        }
      });
      const {value, status} = res.data;
      value.capabilities.should.deep.equal(Object.assign({}, DEFAULT_CAPS, {
        fakeCap: 'Foo',
      }));
      value.sessionId.should.exist;
      should.not.exist(status);
      await axios.delete(`http://${TEST_HOST}:${TEST_PORT}/wd/hub/session/${value.sessionId}`);
    });

    it('should return value object for MJSONWP as desiredCapabilities', async function () {
      const res = await axios.post(`http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`, {
        desiredCapabilities: DEFAULT_CAPS
      });
      const {value, status, sessionId} = res.data;
      value.should.deep.equal(DEFAULT_CAPS);
      status.should.equal(0);
      sessionId.should.exist;
      await axios.delete(`http://${TEST_HOST}:${TEST_PORT}/wd/hub/session/${sessionId}`);
    });
  });

});
