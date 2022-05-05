// transpile:mocha

import _ from 'lodash';
import {FakeDriver} from '../../lib';
import {W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers';
import {baseDriverUnitTests} from '@appium/base-driver/build/test/basedriver';

// test the same things as for base driver
baseDriverUnitTests(FakeDriver, _.cloneDeep(W3C_PREFIXED_CAPS));

describe('FakeDriver', function () {
  it('should not start a session when a unique session is already running', async function () {
    let d1 = new FakeDriver();
    let [uniqueSession] = await d1.createSession(null, null, {
      alwaysMatch: {
        ..._.cloneDeep(W3C_PREFIXED_CAPS),
        'appium:uniqueApp': true,
      },
      firstMatch: [{}],
    });
    uniqueSession.should.be.a('string');
    let d2 = new FakeDriver();
    let otherSessionData = [d1.driverData];
    try {
      await d2
        .createSession(null, null, _.cloneDeep(W3C_CAPS), otherSessionData)
        .should.eventually.be.rejectedWith(/unique/);
    } finally {
      await d1.deleteSession(uniqueSession);
    }
  });
  it('should start a new session when another non-unique session is running', async function () {
    let d1 = new FakeDriver();
    let [session1Id] = await d1.createSession(null, null, _.cloneDeep(W3C_CAPS));
    session1Id.should.be.a('string');
    let d2 = new FakeDriver();
    let [session2Id] = await d2.createSession(null, null, _.cloneDeep(W3C_CAPS));
    session2Id.should.be.a('string');
    session1Id.should.not.equal(session2Id);
    await d1.deleteSession(session1Id);
    await d2.deleteSession(session2Id);
  });
});
