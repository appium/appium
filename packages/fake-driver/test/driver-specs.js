// transpile:mocha

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { FakeDriver } from '..';
import { DEFAULT_CAPS } from './helpers';
import { baseDriverUnitTests } from '@appium/base-driver/build/test/basedriver';

chai.use(chaiAsPromised);
chai.should();

// test the same things as for base driver
baseDriverUnitTests(FakeDriver, DEFAULT_CAPS);

describe('FakeDriver', function () {
  it('should not start a session when a unique session is already running', async function () {
    let d1 = new FakeDriver();
    let [uniqueSession] = await d1.createSession(null, null, {
      alwaysMatch: { ...DEFAULT_CAPS, 'appium:uniqueApp': true },
      firstMatch: [{}],
    });
    uniqueSession.should.be.a('string');
    let d2 = new FakeDriver();
    let otherSessionData = [d1.driverData];
    try {
      await d2
        .createSession(
          null,
          null,
          {
            alwaysMatch: { ...DEFAULT_CAPS },
            firstMatch: [{}],
          },
          otherSessionData,
        )
        .should.eventually.be.rejectedWith(/unique/);
    } finally {
      await d1.deleteSession(uniqueSession);
    }
  });
  it('should start a new session when another non-unique session is running', async function () {
    let d1 = new FakeDriver();
    let [session1Id] = await d1.createSession(null, null, {
      alwaysMatch: { ...DEFAULT_CAPS },
      firstMatch: [{}],
    },);
    session1Id.should.be.a('string');
    let d2 = new FakeDriver();
    let [session2Id] = await d2.createSession(null, null, {
      alwaysMatch: { ...DEFAULT_CAPS },
      firstMatch: [{}],
    });
    session2Id.should.be.a('string');
    session1Id.should.not.equal(session2Id);
    await d1.deleteSession(session1Id);
    await d2.deleteSession(session2Id);
  });
});
