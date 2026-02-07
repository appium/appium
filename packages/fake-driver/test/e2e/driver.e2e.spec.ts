import axios from 'axios';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {driverE2ETestSuite} from '@appium/driver-test-support';
import {FakeDriver, startServer} from '../../lib/index.js';
import {
  BASE_CAPS,
  deleteSession,
  initSession,
  TEST_HOST,
  TEST_PORT,
  W3C_PREFIXED_CAPS,
} from '../helpers';
import contextTests from './context-tests';
import findElementTests from './find-element-tests';
import elementInteractionTests from './element-interaction-tests';
import alertTests from './alert-tests';
import generalTests from './general-tests';

chai.use(chaiAsPromised);

const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';

// test the same things as for base driver
// @ts-expect-error FakeDriver constructor opts differ from DriverClass expectation
driverE2ETestSuite(FakeDriver, W3C_PREFIXED_CAPS);

describe('FakeDriver - via HTTP', function () {
  let server: Awaited<ReturnType<typeof startServer>> | null = null;

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
      const driver = await initSession(W3C_PREFIXED_CAPS);
      expect(driver.sessionId).to.exist;
      expect(driver.sessionId).to.be.a('string');
      await deleteSession(driver);
      await expect(driver.getTitle()).to.be.rejected;
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
      const res = await axios.post(`http://${TEST_HOST}:${TEST_PORT}/session`, {
        capabilities: {
          alwaysMatch: W3C_PREFIXED_CAPS,
          firstMatch: [{'appium:fakeCap': 'Foo'}],
        },
      });
      const {value, status} = res.data;
      expect(value.capabilities).to.deep.equal({...BASE_CAPS, fakeCap: 'Foo'});
      expect(value.sessionId).to.exist;
      expect(status).to.not.exist;
      await axios.delete(`http://${TEST_HOST}:${TEST_PORT}/session/${value.sessionId}`);
    });

    it('should fail if given unsupported desiredCapabilities', async function () {
      await expect(
        axios.post(`http://${TEST_HOST}:${TEST_PORT}/session`, {
          desiredCapabilities: W3C_PREFIXED_CAPS,
        })
      ).to.eventually.be.rejectedWith(/500/);
    });
  });
});
