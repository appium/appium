// transpile:mocha

import { AppiumDriver } from '../lib/appium';
import { FakeDriver } from 'appium-fake-driver';
import { BASE_CAPS, W3C_CAPS } from './helpers';
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { sleep } from 'asyncbox';
import { insertAppiumPrefixes } from '../lib/utils';

chai.should();
chai.use(chaiAsPromised);

const SESSION_ID = 1;

describe('AppiumDriver', function () {
  describe('AppiumDriver', function () {
    function getDriverAndFakeDriver () {
      const appium = new AppiumDriver({});
      const fakeDriver = new FakeDriver();
      const mockFakeDriver = sinon.mock(fakeDriver);
      appium._findMatchingDriver = function () {
        return {
          driver: function Driver () {
            return fakeDriver;
          },
          version: '1.2.3',
        };
      };
      return [appium, mockFakeDriver];
    }
    describe('createSession', function () {
      let appium;
      let mockFakeDriver;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async function () {
        mockFakeDriver.restore();
        await appium.deleteSession(SESSION_ID);
      });

      it(`should call inner driver's createSession with desired capabilities`, async function () {
        mockFakeDriver.expects('createSession')
          .once().withExactArgs(BASE_CAPS, undefined, null, [])
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities`, async function () {
        let defaultCaps = {deviceName: 'Emulator'};
        let allCaps = _.extend(_.clone(defaultCaps), BASE_CAPS);
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects('createSession')
          .once().withArgs(allCaps)
          .returns([SESSION_ID, allCaps]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities without overriding caps`, async function () {
        // a default capability with the same key as a desired capability
        // should do nothing
        let defaultCaps = {platformName: 'Ersatz'};
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects('createSession')
          .once().withArgs(BASE_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it('should kill all other sessions if sessionOverride is on', async function () {
        appium.args.sessionOverride = true;

        // mock three sessions that should be removed when the new one is created
        let fakeDrivers = [
          new FakeDriver(),
          new FakeDriver(),
          new FakeDriver(),
        ];
        let mockFakeDrivers = _.map(fakeDrivers, (fd) => {return sinon.mock(fd);});
        mockFakeDrivers[0].expects('deleteSession')
          .once();
        mockFakeDrivers[1].expects('deleteSession')
          .once()
          .throws('Cannot shut down Android driver; it has already shut down');
        mockFakeDrivers[2].expects('deleteSession')
          .once();
        appium.sessions['abc-123-xyz'] = fakeDrivers[0];
        appium.sessions['xyz-321-abc'] = fakeDrivers[1];
        appium.sessions['123-abc-xyz'] = fakeDrivers[2];

        let sessions = await appium.getSessions();
        sessions.should.have.length(3);

        mockFakeDriver.expects('createSession')
          .once().withExactArgs(BASE_CAPS, undefined, null, [])
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);

        sessions = await appium.getSessions();
        sessions.should.have.length(1);

        for (let mfd of mockFakeDrivers) {
          mfd.verify();
        }
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument, if provided', async function () {
        mockFakeDriver.expects('createSession')
          .once().withArgs(null, undefined, W3C_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(undefined, undefined, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument with additional provided parameters', async function () {
        let w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
        };
        mockFakeDriver.expects('createSession')
          .once().withArgs(null, undefined, {
            alwaysMatch: {
              ...w3cCaps.alwaysMatch,
              'appium:someOtherParm': 'someOtherParm',
            },
            firstMatch: [{}],
          })
          .returns([SESSION_ID, insertAppiumPrefixes(BASE_CAPS)]);

        await appium.createSession(undefined, undefined, w3cCaps);
        mockFakeDriver.verify();
      });
      it('should call "createSession" with JSONWP capabilities if W3C has incomplete capabilities', async function () {
        let w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
        };

        let jsonwpCaps = {
          ...BASE_CAPS,
          automationName: 'Fake',
          someOtherParam: 'someOtherParam',
        };

        let expectedW3cCaps = {
          ...w3cCaps,
          alwaysMatch: {
            ...w3cCaps.alwaysMatch,
            'appium:automationName': 'Fake',
            'appium:someOtherParam': 'someOtherParam',
          },
        };

        mockFakeDriver.expects('createSession')
          .once().withArgs(jsonwpCaps, undefined, expectedW3cCaps)
          .returns([SESSION_ID, jsonwpCaps]);

        await appium.createSession(jsonwpCaps, undefined, w3cCaps);
        mockFakeDriver.verify();
      });
    });
    describe('deleteSession', function () {
      let appium;
      let mockFakeDriver;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(function () {
        mockFakeDriver.restore();
      });
      it('should remove the session if it is found', async function () {
        let [sessionId] = (await appium.createSession(BASE_CAPS)).value;
        let sessions = await appium.getSessions();
        sessions.should.have.length(1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getSessions();
        sessions.should.have.length(0);
      });
      it('should call inner driver\'s deleteSession method', async function () {
        const [sessionId] = (await appium.createSession(BASE_CAPS)).value;
        mockFakeDriver.expects('deleteSession')
          .once().withExactArgs(sessionId, [])
          .returns();
        await appium.deleteSession(sessionId);
        mockFakeDriver.verify();

        // cleanup, since we faked the delete session call
        await mockFakeDriver.object.deleteSession();
      });
    });
    describe('getSessions', function () {
      let appium, mockFakeDriver;
      let sessions;
      before(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async function () {
        for (let session of sessions) {
          await appium.deleteSession(session.id);
        }
        mockFakeDriver.restore();
      });
      it('should return an empty array of sessions', async function () {
        sessions = await appium.getSessions();
        sessions.should.be.an('array');
        sessions.should.be.empty;
      });
      it('should return sessions created', async function () {
        let caps1 = {...BASE_CAPS, cap: 'value'};
        let caps2 = {...BASE_CAPS, cap: 'other value'};
        mockFakeDriver.expects('createSession').once()
          .returns(['fake-session-id-1', caps1]);
        let session1 = (await appium.createSession(caps1)).value;
        mockFakeDriver.expects('createSession').once()
          .returns(['fake-session-id-2', caps2]);
        let session2 = (await appium.createSession(caps2)).value;

        sessions = await appium.getSessions();
        sessions.should.be.an('array');
        sessions.should.have.length(2);
        sessions[0].id.should.equal(session1[0]);
        caps1.should.eql(session1[1]);
        sessions[1].id.should.equal(session2[0]);
        caps2.should.eql(session2[1]);
      });
    });
    describe('getStatus', function () {
      let appium;
      before(function () {
        appium = new AppiumDriver({});
      });
      it('should return a status', async function () {
        let status = await appium.getStatus();
        status.build.should.exist;
        status.build.version.should.exist;
      });
    });
    describe('sessionExists', function () {
    });
    describe('attachUnexpectedShutdownHandler', function () {
      let appium;
      let mockFakeDriver;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async function () {
        await mockFakeDriver.object.deleteSession();
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });

      it('should remove session if inner driver unexpectedly exits with an error', async function () {
        let [sessionId,] = (await appium.createSession(_.clone(BASE_CAPS))).value; // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown', new Error('Oops'));
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
      it('should remove session if inner driver unexpectedly exits with no error', async function () {
        let [sessionId,] = (await appium.createSession(_.clone(BASE_CAPS))).value; // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown');
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
    });
  });
});
