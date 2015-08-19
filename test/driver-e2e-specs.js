// transpile:mocha

import _ from 'lodash';
import B from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import wd from 'wd';
import 'mochawait';
import { main as appiumServer } from '../lib/main';
import { getDefaultArgs } from '../lib/parser';
import { TEST_FAKE_APP, TEST_HOST, TEST_PORT } from './helpers';

chai.use(chaiAsPromised);

const should = chai.should();
const shouldStartServer = process.env.USE_RUNNING_SERVER !== "0";
const caps = {platformName: "Fake", deviceName: "Fake", app: TEST_FAKE_APP};

describe('FakeDriver - via HTTP', () => {
  let server = null;
  before(async () => {
    if (shouldStartServer) {
      let args = getDefaultArgs();
      args.port = TEST_PORT;
      args.host = TEST_HOST;
      server = await appiumServer(args);
    }
  });
  after(async () => {
    if (server) {
      await B.promisify(server.close.bind(server))();
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
  });
});
