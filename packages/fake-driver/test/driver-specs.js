// transpile:mocha

import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { FakeDriver } from '..';
import { DEFAULT_CAPS } from './helpers';
import { baseDriverUnitTests } from 'appium-base-driver/build/test/basedriver';


chai.use(chaiAsPromised);
chai.should();

// test the same things as for base driver
baseDriverUnitTests(FakeDriver, DEFAULT_CAPS);

describe('FakeDriver', function () {
  it('should not start a session when a unique session is already running', async function () {
    let d1 = new FakeDriver();
    let caps1 = _.clone(DEFAULT_CAPS);
    caps1.uniqueApp = true;
    let [uniqueSession] = await d1.createSession(caps1, {});
    uniqueSession.should.be.a('string');
    let d2 = new FakeDriver();
    let otherSessionData = [d1.driverData];
    await d2.createSession(DEFAULT_CAPS, {}, null, otherSessionData)
            .should.eventually.be.rejectedWith(/unique/);
    await d1.deleteSession(uniqueSession);
  });
  it('should start a new session when another non-unique session is running', async function () {
    let d1 = new FakeDriver();
    let [session1Id] = await d1.createSession(DEFAULT_CAPS, {});
    session1Id.should.be.a('string');
    let d2 = new FakeDriver();
    let otherSessionData = [d1.driverData];
    let [session2Id] = await d2.createSession(DEFAULT_CAPS, {}, null, otherSessionData);
    session2Id.should.be.a('string');
    session1Id.should.not.equal(session2Id);
    await d1.deleteSession(session1Id);
    await d2.deleteSession(session2Id);
  });
});
