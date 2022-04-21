// @ts-check

import { PLUGIN_TYPE } from '../../lib/constants';
import B from 'bluebird';
import { BaseDriver } from '@appium/base-driver';
import { FakeDriver } from '@appium/fake-driver';
import { sleep } from 'asyncbox';
import _ from 'lodash';
import { createSandbox } from 'sinon';
import { finalizeSchema, registerSchema, resetSchema } from '../../lib/schema/schema';
import { insertAppiumPrefixes, removeAppiumPrefixes } from '../../lib/utils';
import { rewiremock, BASE_CAPS, W3C_CAPS, W3C_PREFIXED_CAPS } from '../helpers';

const SESSION_ID = '1';

describe('AppiumDriver', function () {
  /** @type {sinon.SinonSandbox} */
  let sandbox;

  let AppiumDriver;

  let MockConfig;

  beforeEach(function () {
    sandbox = createSandbox();
    resetSchema();
    finalizeSchema();

    MockConfig = {
      getBuildInfo: sandbox.stub().returns({
        version: '2.0'
      }),
      updateBuildInfo: sandbox.stub().resolves(),
      APPIUM_VER: '2.0'
    };
    ({AppiumDriver} = rewiremock.proxy(() => require('../../lib/appium'), {
      '../../lib/config': MockConfig
    }));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should not emit an uncaught rejection if updateBuildInfo() fails', async function () {
      const err = new Error('oops');
      // this test is wacky because we do not await the call to `updateBuildInfo()` within
      // the constructor. in that case, we won't actually know _when_ the promise is resolved or rejected.
      // the following is the workaround
      const promise = new B((resolve) => {
        MockConfig.updateBuildInfo.callsFake(() => {
          resolve();
          return B.reject(err);
        });
      });

      let ad = new AppiumDriver({});
      // triggers the `log` getter to set `_log`
      ad.log;
      // now we can stub `_log`, since it exists
      sandbox.stub(ad._log, 'debug');
      // finally, wait for `updateBuildInfo()` to finish up
      await promise;
      ad._log.debug.should.have.been.calledOnceWith(err);
    });
  });

  describe('instance method', function () {
    let fakeDriver;

    /**
     *
     * @param {*} appiumArgs
     * @param {*} DriverClass
     * @returns {[AppiumDriver, sinon.SinonMock]}
     */
    function getDriverAndFakeDriver (appiumArgs = {}, DriverClass = FakeDriver) {
      const appium = new AppiumDriver(appiumArgs);
      fakeDriver = new DriverClass();
      const mockFakeDriver = sandbox.mock(fakeDriver);
      const mockedDriverReturnerClass = function Driver () {
        return fakeDriver;
      };

      appium.driverConfig = {
        findMatchingDriver: sandbox.stub().returns({
          driver: mockedDriverReturnerClass,
          version: '1.2.3',
          driverName: 'fake',
        })
      };

      return [appium, mockFakeDriver];
    }
    describe('createSession', function () {
      /** @type {AppiumDriver} */
      let appium;
      /** @type {sinon.SinonMock} */
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
          .once().withExactArgs(undefined, null, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(undefined, null, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities`, async function () {
        let defaultCaps = {'appium:someCap': 'hello'};
        let allCaps = {...W3C_CAPS, alwaysMatch: {...W3C_CAPS.alwaysMatch, ...defaultCaps}};
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects('createSession')
          .once().withArgs(undefined, null, allCaps)
          .returns([SESSION_ID, removeAppiumPrefixes(allCaps.alwaysMatch)]);
        await appium.createSession(undefined, null, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities without overriding caps`, async function () {
        // a default capability with the same key as a desired capability
        // should do nothing
        let defaultCaps = {platformName: 'Ersatz'};
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects('createSession')
          .once().withArgs(undefined, null, W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(undefined, null, W3C_CAPS);
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
        let mockFakeDrivers = _.map(fakeDrivers, (fd) => sandbox.mock(fd));
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
          .once().withExactArgs(undefined, null, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(undefined, null, W3C_CAPS);

        sessions = await appium.getSessions();
        sessions.should.have.length(1);

        for (let mfd of mockFakeDrivers) {
          mfd.verify();
        }
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument, if provided', async function () {
        mockFakeDriver.expects('createSession')
          .once().withArgs(undefined, undefined, W3C_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(undefined, undefined, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument with additional provided parameters', async function () {
        /** @type {import('@appium/types').W3CCapabilities} */
        let w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
        };
        mockFakeDriver.expects('createSession')
          .once().withArgs(undefined, undefined, {
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
      it('should not call "createSession" with JSONWP capabilities if W3C has incomplete capabilities', async function () {
        const w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            'appium:someOtherParm': 'someOtherParm',
          },
        };

        const jsonwpCaps = {
          ...BASE_CAPS,
          automationName: 'Fake',
          someOtherParam: 'someOtherParam',
        };

        mockFakeDriver.expects('createSession').never();
        await appium.createSession(jsonwpCaps, undefined, w3cCaps);
        mockFakeDriver.verify();
      });

      it('should assign args to property `cliArgs`', async function () {
        class ArgsDriver extends BaseDriver {
        }
        const args = {driver: {fake: {randomArg: 1234}}};
        [appium, mockFakeDriver] = getDriverAndFakeDriver(args, ArgsDriver);
        const {value} = await appium.createSession(undefined, undefined, W3C_CAPS);
        try {
          fakeDriver.cliArgs.should.eql({randomArg: 1234});
        } finally {
          await appium.deleteSession(value[0]);
        }
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
        let [sessionId] = (await appium.createSession(null, null, W3C_CAPS)).value;
        let sessions = await appium.getSessions();
        sessions.should.have.length(1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getSessions();
        sessions.should.have.length(0);
      });
      it('should call inner driver\'s deleteSession method', async function () {
        const [sessionId] = (await appium.createSession(null, null, W3C_CAPS)).value;
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
        let caps1 = {alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'value'}};
        let caps2 = {alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'other value'}};
        mockFakeDriver.expects('createSession').once()
          .returns(['fake-session-id-1', removeAppiumPrefixes(caps1.alwaysMatch)]);
        let [session1Id, session1Caps] = (await appium.createSession(null, null, caps1)).value;
        mockFakeDriver.expects('createSession').once()
          .returns(['fake-session-id-2', removeAppiumPrefixes(caps2.alwaysMatch)]);
        let [session2Id, session2Caps] = (await appium.createSession(null, null, caps2)).value;

        sessions = await appium.getSessions();
        sessions.should.be.an('array');
        sessions.should.have.length(2);
        sessions[0].id.should.equal(session1Id);
        removeAppiumPrefixes(caps1.alwaysMatch).should.eql(session1Caps);
        sessions[1].id.should.equal(session2Id);
        removeAppiumPrefixes(caps2.alwaysMatch).should.eql(session2Caps);
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
      /** @type {AppiumDriver} */
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
        let [sessionId,] = (await appium.createSession(null, null, _.clone(W3C_CAPS))).value; // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown', new Error('Oops'));
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
      it('should remove session if inner driver unexpectedly exits with no error', async function () {
        let [sessionId,] = (await appium.createSession(null, null, _.clone(W3C_CAPS))).value; // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown');
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
    });
    describe('createPluginInstances', function () {
      class NoArgsPlugin {}
      NoArgsPlugin.pluginName = 'noargs';
      NoArgsPlugin.baseVersion = '1.0';

      class ArgsPlugin {}
      ArgsPlugin.pluginName = 'args';
      ArgsPlugin.baseVersion = '1.0';

      class ArrayArgPlugin {}
      ArrayArgPlugin.pluginName = 'arrayarg';
      ArrayArgPlugin.baseVersion = '1.0';

      beforeEach(function () {
        resetSchema();
        // to establish defaults, we need to register a schema for the plugin.
        // note that the `noargs` plugin does not need a schema, because it
        // accepts no arguments.
        registerSchema(PLUGIN_TYPE, ArgsPlugin.pluginName, {
          type: 'object',
          properties: {
            randomArg: {
              type: 'number',
              default: 2000
            }
          }
        });
        registerSchema(PLUGIN_TYPE, ArrayArgPlugin.pluginName, {
          type: 'object',
          properties: {
            arr: {
              type: 'array',
              default: []
            }
          }
        });
        finalizeSchema();
      });

      describe('when args are not present', function () {
        it('should not set CLI args', function () {
          const appium = new AppiumDriver({});
          appium.pluginClasses = [NoArgsPlugin, ArgsPlugin];
          for (const plugin of appium.createPluginInstances()) {
            chai.expect(plugin.cliArgs).not.to.exist;
          }
        });
      });

      describe('when args are equal to the schema defaults', function () {
        it('should not set CLI args', function () {
          const appium = new AppiumDriver({plugin: {[ArgsPlugin.pluginName]: {randomArg: 2000}}});
          appium.pluginClasses = [NoArgsPlugin, ArgsPlugin];
          for (const plugin of appium.createPluginInstances()) {
            chai.expect(plugin.cliArgs).not.to.exist;
          }
        });

        describe('when the default is an "object"', function () {
          it('should not set CLI args', function () {
            const appium = new AppiumDriver({plugin: {[ArrayArgPlugin.pluginName]: {arr: []}}});
            appium.pluginClasses = [NoArgsPlugin, ArgsPlugin, ArrayArgPlugin];
            for (const plugin of appium.createPluginInstances()) {
              chai.expect(plugin.cliArgs).not.to.exist;
            }
          });
        });
      });

      describe('when args are not equal to the schema defaults', function () {
        it('should add cliArgs to the plugin', function () {
          const appium = new AppiumDriver({plugin: {args: {randomArg: 1234}}});
          appium.pluginClasses = [ArgsPlugin];
          const plugin = _.first(appium.createPluginInstances());
          plugin.cliArgs.should.eql({randomArg: 1234});
        });
      });
    });
  });
});
