// transpile:mocha

import axios from 'axios';
import { baseDriverE2ETests } from '@appium/base-driver/build/test/basedriver';
import { FakeDriver, startServer } from '../../lib/index.js';
import { BASE_CAPS, deleteSession, initSession, TEST_HOST, TEST_PORT, W3C_PREFIXED_CAPS } from '../helpers';
import contextTests from './context-tests';
import findElementTests from './find-element-tests';
import elementInteractionTests from './element-interaction-tests';
import alertTests from './alert-tests';
import generalTests from './general-tests';


const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';


// test the same things as for base driver
baseDriverE2ETests(FakeDriver, W3C_PREFIXED_CAPS);

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
      let driver = await initSession(W3C_PREFIXED_CAPS);
      should.exist(driver.sessionId);
      driver.sessionId.should.be.a('string');
      await deleteSession(driver);
      await driver.getTitle().should.eventually.be.rejectedWith(/terminated/);
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
          firstMatch: [
            {'appium:fakeCap': 'Foo', }
          ]
        }});
      const {value, status} = res.data;
      value.capabilities.should.deep.equal({...BASE_CAPS, fakeCap: 'Foo'});
      value.sessionId.should.exist;
      should.not.exist(status);
      await axios.delete(`http://${TEST_HOST}:${TEST_PORT}/session/${value.sessionId}`);
    });

    it('should fail if given unsupported desiredCapabilities', async function () {
      await axios.post(`http://${TEST_HOST}:${TEST_PORT}/session`, {
        desiredCapabilities: W3C_PREFIXED_CAPS
      }).should.eventually.be.rejectedWith(/500/);
    });
  });

});
