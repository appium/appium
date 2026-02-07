import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {FakeDriver} from '../../lib';
import {W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers';
import {driverUnitTestSuite} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

// test the same things as for base driver
// @ts-expect-error FakeDriver constructor opts differ from DriverClass expectation
driverUnitTestSuite(FakeDriver, _.cloneDeep(W3C_PREFIXED_CAPS));

describe('FakeDriver', function () {
  it('should not start a session when a unique session is already running', async function () {
    const d1 = new FakeDriver();
    const [uniqueSession] = await d1.createSession(null as any, null as any, {
      alwaysMatch: {
        ..._.cloneDeep(W3C_PREFIXED_CAPS),
        'appium:uniqueApp': true,
      },
      firstMatch: [{}],
    });
    expect(uniqueSession).to.be.a('string');
    const d2 = new FakeDriver();
    const otherSessionData = [d1.driverData];
    try {
      await expect(
        d2.createSession(null as any, null as any, _.cloneDeep(W3C_CAPS), otherSessionData)
      ).to.eventually.be.rejectedWith(/unique/);
    } finally {
      await d1.deleteSession(uniqueSession);
    }
  });
  it('should start a new session when another non-unique session is running', async function () {
    const d1 = new FakeDriver();
    const [session1Id] = await d1.createSession(null as any, null as any, _.cloneDeep(W3C_CAPS));
    expect(session1Id).to.be.a('string');
    const d2 = new FakeDriver();
    const [session2Id] = await d2.createSession(null as any, null as any, _.cloneDeep(W3C_CAPS));
    expect(session2Id).to.be.a('string');
    expect(session1Id).to.not.equal(session2Id);
    await d1.deleteSession(session1Id);
    await d2.deleteSession(session2Id);
  });
});
