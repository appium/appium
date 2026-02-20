// @ts-check

import type {Constraints, W3CCapabilities} from '@appium/types';
import type {SinonSandbox, SinonStubbedMember} from 'sinon';
import {PLUGIN_TYPE, SESSION_DISCOVERY_FEATURE} from '../../lib/constants';
import {BaseDriver} from '@appium/base-driver';
import {FakeDriver} from '@appium/fake-driver';
import {sleep} from 'asyncbox';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {createSandbox} from 'sinon';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema';
import {insertAppiumPrefixes, removeAppiumPrefixes} from '../../lib/utils';
import {rewiremock, BASE_CAPS, W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers';
import {BasePlugin} from '@appium/base-plugin';
import type * as AppiumModule from '../../lib/appium';

interface MockConfigShape {
  getBuildInfo: SinonStubbedMember<() => {version: string}>;
  updateBuildInfo: SinonStubbedMember<() => Promise<void>>;
  APPIUM_VER: string;
}

const {expect} = chai;
chai.use(chaiAsPromised);

const SESSION_ID = '1';
const SESSION_DISCOVERY_ENABLED = {allowInsecure: [`*:${SESSION_DISCOVERY_FEATURE}`]};

describe('AppiumDriver', function () {
  let sandbox: SinonSandbox;
  let AppiumDriver: typeof AppiumModule.AppiumDriver;
  let MockConfig: MockConfigShape;

  beforeEach(function () {
    sandbox = createSandbox();
    resetSchema();
    finalizeSchema();

    MockConfig = {
      getBuildInfo: sandbox.stub().callsFake(() => ({version: MockConfig.APPIUM_VER})) as MockConfigShape['getBuildInfo'],
      updateBuildInfo: sandbox.stub().resolves() as MockConfigShape['updateBuildInfo'],
      APPIUM_VER: '2.0',
    };
    ({AppiumDriver} = rewiremock.proxy(() => require('../../lib/appium'), {
      '../../lib/config': MockConfig,
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
      const promise = new Promise<void>((resolve) => {
        MockConfig.updateBuildInfo.callsFake(() => {
          resolve();
          return Promise.reject(err);
        });
      });

      const ad = new AppiumDriver({} as any);
      // triggers the `log` getter to set `_log`
      ad.log;
      // now we can stub `_log`, since it exists
      const debugStrub = sandbox.stub((ad as any)._log, 'debug');
      // finally, wait for `updateBuildInfo()` to finish up
      await promise;
      expect(debugStrub.calledOnce).to.be.true;
    });
  });

  describe('instance method', function () {
    let fakeDriver;

    function getDriverAndFakeDriver(
      appiumArgs: any = {},
      DriverClass: typeof FakeDriver = FakeDriver
    ): [InstanceType<typeof AppiumModule.AppiumDriver>, import('sinon').SinonMock] {
      const appium = new AppiumDriver(appiumArgs);
      fakeDriver = new DriverClass();
      const mockFakeDriver = sandbox.mock(fakeDriver);
      const mockedDriverReturnerClass = function Driver() {
        return fakeDriver;
      };

      (appium as any).driverConfig = {
        findMatchingDriver: sandbox.stub().returns({
          driver: mockedDriverReturnerClass,
          version: '1.2.3',
          driverName: 'fake',
        }),
      };

      return [appium, mockFakeDriver];
    }
    describe('configureGlobalFeatures', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;

      function createDriver(cliArgs: any) {
        appium = new AppiumDriver(cliArgs);
        appium.configureGlobalFeatures();
      };
      it('should not allow insecure features by default', function () {
        createDriver({} as any);
        expect(appium.allowInsecure).to.be.empty;
        expect(appium.denyInsecure).to.be.empty;
        expect(appium.relaxedSecurityEnabled).to.be.false;
      });
      it('should allow insecure features', function () {
        createDriver({allowInsecure: ['foo:bar']} as any);
        expect(appium.allowInsecure).to.eql(['foo:bar']);
      });
      it('should deny insecure features', function () {
        createDriver({denyInsecure: ['foo:baz']} as any);
        expect(appium.denyInsecure).to.eql(['foo:baz']);
      });
      it('should allow relaxed security', function () {
        createDriver({relaxedSecurityEnabled: true} as any);
        expect(appium.relaxedSecurityEnabled).to.be.true;
      });
      it('should ignore allowed features in combination with relaxed security', function () {
        createDriver({
          allowInsecure: ['foo:bar'],
          relaxedSecurityEnabled: true,
        } as any);
        expect(appium.allowInsecure).to.be.empty;
        expect(appium.relaxedSecurityEnabled).to.be.true;
      });
    });
    describe('createSession', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: import('sinon').SinonMock;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver(SESSION_DISCOVERY_ENABLED);
      });
      afterEach(async function () {
        mockFakeDriver.restore();
        await appium.deleteSession(SESSION_ID);
      });

      it(`should call inner driver's createSession with desired capabilities`, async function () {
        mockFakeDriver
          .expects('createSession')
          .once()
          .withExactArgs(W3C_CAPS, W3C_CAPS, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(W3C_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities`, async function () {
        const defaultCaps = {'appium:someCap': 'hello'};
        const allCaps = {
          ...W3C_CAPS,
          alwaysMatch: {...W3C_CAPS.alwaysMatch, ...defaultCaps},
        };
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver
          .expects('createSession')
          .once()
          .withArgs(allCaps, allCaps, allCaps)
          .returns([SESSION_ID, removeAppiumPrefixes(allCaps.alwaysMatch)]);
        await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it(`should call inner driver's createSession with desired and default capabilities without overriding caps`, async function () {
        // a default capability with the same key as a desired capability
        // should do nothing
        const defaultCaps = {platformName: 'Ersatz'};
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver
          .expects('createSession')
          .once()
          .withArgs(W3C_CAPS, W3C_CAPS, W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should kill all other sessions if sessionOverride is on', async function () {
        appium.configureGlobalFeatures();
        appium.args.sessionOverride = true;

        // mock three sessions that should be removed when the new one is created
        const fakeDrivers = [new FakeDriver(), new FakeDriver(), new FakeDriver()];
        const mockFakeDrivers = _.map(fakeDrivers, (fd) => sandbox.mock(fd));
        mockFakeDrivers[0].expects('deleteSession').once();
        mockFakeDrivers[1]
          .expects('deleteSession')
          .once()
          .throws('Cannot shut down Android driver; it has already shut down');
        mockFakeDrivers[2].expects('deleteSession').once();
        appium.sessions['abc-123-xyz'] = fakeDrivers[0];
        appium.sessions['xyz-321-abc'] = fakeDrivers[1];
        appium.sessions['123-abc-xyz'] = fakeDrivers[2];

        let sessions = await appium.getAppiumSessions();
        expect(sessions).to.have.length(3);

        mockFakeDriver
          .expects('createSession')
          .once()
          .withExactArgs(W3C_CAPS, W3C_CAPS, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);

        sessions = await appium.getAppiumSessions();
        expect(sessions).to.have.length(1);

        for (const mfd of mockFakeDrivers) {
          mfd.verify();
        }
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument, if provided', async function () {
        mockFakeDriver
          .expects('createSession')
          .once()
          .withArgs(W3C_CAPS, W3C_CAPS, W3C_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument with additional provided parameters', async function () {
        const w3cCaps: W3CCapabilities<Constraints> = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
        };
        const expectedCaps = {
          alwaysMatch: {
            ...w3cCaps.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
          firstMatch: [{}],
        };
        mockFakeDriver
          .expects('createSession')
          .once()
          .withArgs(expectedCaps, expectedCaps, expectedCaps)
          .returns([SESSION_ID, insertAppiumPrefixes(BASE_CAPS)]);

        await appium.createSession(w3cCaps, w3cCaps, w3cCaps);
        mockFakeDriver.verify();
      });

      it('should assign args to property `cliArgs`', async function () {
        class ArgsDriver extends BaseDriver<Constraints> {}
        const args = {driver: {fake: {randomArg: 1234}}};
        [appium, mockFakeDriver] = getDriverAndFakeDriver(args, ArgsDriver as typeof FakeDriver);
        const {value} = await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);
        try {
          expect(fakeDriver.cliArgs).to.eql({randomArg: 1234});
        } finally {
          await appium.deleteSession(value![0]);
        }
      });
    });
    describe('deleteSession', function () {
      let appium;
      let mockFakeDriver;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver(SESSION_DISCOVERY_ENABLED);
      });
      afterEach(function () {
        mockFakeDriver.restore();
      });
      it('should remove the session if it is found', async function () {
        appium.configureGlobalFeatures();
        const [sessionId] = (await appium.createSession(null as any, null as any, W3C_CAPS)).value!;
        let sessions = await appium.getAppiumSessions();
        expect(sessions).to.have.length(1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getAppiumSessions();
        expect(sessions).to.have.length(0);
      });
      it("should call inner driver's deleteSession method", async function () {
        const [sessionId] = (await appium.createSession(null as any, null as any, W3C_CAPS)).value!;
        mockFakeDriver.expects('deleteSession').once().withExactArgs(sessionId, []).returns();
        await appium.deleteSession(sessionId);
        mockFakeDriver.verify();

        // cleanup, since we faked the delete session call
        await (mockFakeDriver as any).object.deleteSession();
      });
    });
    describe('configureDriverFeatures', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;

      async function getDriverInstance(appiumArgs: any): Promise<FakeDriver> {
        appium = new AppiumDriver(appiumArgs);
        appium.configureGlobalFeatures();
        const fakeDriver = new FakeDriver();
        const mockFakeDriver = sandbox.mock(fakeDriver);
        const mockedDriverReturnerClass = function Driver() {
          return fakeDriver;
        };

        (appium as any).driverConfig = {
          findMatchingDriver: sandbox.stub().returns({
            driver: mockedDriverReturnerClass,
            version: '1.2.3',
            driverName: 'fake',
          }),
        };

        mockFakeDriver
          .expects('createSession')
          .once()
          .withExactArgs(undefined, null, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(undefined as any, null as any, W3C_CAPS);

        return fakeDriver;
      }
      afterEach(async function () {
        await appium.deleteSession(SESSION_ID);
      });
      it(`should not apply any insecure features by default`, async function () {
        fakeDriver = await getDriverInstance({});
        expect(fakeDriver.allowInsecure).to.be.empty;
        expect(fakeDriver.denyInsecure).to.be.empty;
        expect(fakeDriver.relaxedSecurityEnabled).to.be.false;
      });
      it(`should apply relaxed security`, async function () {
        fakeDriver = await getDriverInstance({relaxedSecurityEnabled: true});;
        expect(fakeDriver.relaxedSecurityEnabled).to.be.true;
      });
      it(`should apply global-scope insecure features`, async function () {
        fakeDriver = await getDriverInstance({
          allowInsecure: ['*:foo'],
          denyInsecure: ['*:bar'],
        });
        expect(fakeDriver.allowInsecure).to.eql(['*:foo']);
        expect(fakeDriver.denyInsecure).to.eql(['*:bar']);
      });
      it(`should apply driver-scope insecure features only if the driver name matches`, async function () {
        fakeDriver = await getDriverInstance({allowInsecure: ['fake:foo', 'real:bar']});
        expect(fakeDriver.allowInsecure).to.eql(['fake:foo']);
      });
    });
    describe('getAppiumSessions', function () {
      let appium, mockFakeDriver;
      let sessions;
      before(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver(SESSION_DISCOVERY_ENABLED);
        appium.configureGlobalFeatures();
      });
      afterEach(async function () {
        for (const session of sessions) {
          await appium.deleteSession(session.id);
        }
        mockFakeDriver.restore();
      });
      it('should return an empty array of sessions', async function () {
        sessions = await appium.getAppiumSessions();
        expect(sessions).to.be.an('array');
        expect(sessions).to.be.empty;
      });
      it('should return sessions created', async function () {
        const caps1 = {
          alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'value'},
        };
        const caps2 = {
          alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'other value'},
        };
        mockFakeDriver
          .expects('createSession')
          .once()
          .returns(['fake-session-id-1', removeAppiumPrefixes(caps1.alwaysMatch)]);
        const [session1Id, session1Caps] = (await appium.createSession(null as any, null as any, caps1)).value!;
        mockFakeDriver
          .expects('createSession')
          .once()
          .returns(['fake-session-id-2', removeAppiumPrefixes(caps2.alwaysMatch)]);
        const [session2Id, session2Caps] = (await appium.createSession(null as any, null as any, caps2)).value!;

        sessions = await appium.getAppiumSessions();
        expect(sessions).to.be.an('array');
        expect(sessions).to.have.length(2);
        expect(sessions[0].id).to.equal(session1Id);
        expect(sessions[0]).to.have.property('created');
        expect(removeAppiumPrefixes(caps1.alwaysMatch)).to.eql(session1Caps);
        expect(sessions[1].id).to.equal(session2Id);
        expect(sessions[1]).to.have.property('created');
        expect(removeAppiumPrefixes(caps2.alwaysMatch)).to.eql(session2Caps);
      });
    });
    describe('getStatus', function () {
      let appium;
      before(function () {
        appium = new AppiumDriver({} as any);
      });
      it('should return a status', async function () {
        const status = await appium.getStatus();
        expect(status.build).to.exist;
        expect(status.build.version).to.exist;
      });
    });
    describe('sessionExists', function () {});
    describe('attachUnexpectedShutdownHandler', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: import('sinon').SinonMock;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async function () {
        await (mockFakeDriver as any).object.deleteSession();
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });

      it('should remove session if inner driver unexpectedly exits with an error', async function () {
        const [sessionId] = (await appium.createSession(null as any, null as any, _.clone(W3C_CAPS))).value!;
        expect(_.keys(appium.sessions)).to.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown', new Error('Oops'));
        // let event loop spin so rejection is handled
        await sleep(1);
        expect(_.keys(appium.sessions)).to.not.contain(sessionId);
      });
      it('should remove session if inner driver unexpectedly exits with no error', async function () {
        const [sessionId] = (await appium.createSession(null as any, null as any, _.clone(W3C_CAPS))).value!;
        expect(_.keys(appium.sessions)).to.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown');
        // let event loop spin so rejection is handled
        await sleep(1);
        expect(_.keys(appium.sessions)).to.not.contain(sessionId);
      });
    });
    describe('createPluginInstances', function () {
      class NoArgsPlugin extends BasePlugin {}
      (NoArgsPlugin as any).baseVersion = '1.0';

      class ArgsPlugin extends BasePlugin {}
      (ArgsPlugin as any).baseVersion = '1.0';

      class ArrayArgPlugin extends BasePlugin {}
      (ArrayArgPlugin as any).baseVersion = '1.0';

      beforeEach(function () {
        resetSchema();
        // to establish defaults, we need to register a schema for the plugin.
        // note that the `noargs` plugin does not need a schema, because it
        // accepts no arguments.
        registerSchema(PLUGIN_TYPE, 'args', {
          type: 'object',
          properties: {
            randomArg: {
              type: 'number',
              default: 2000,
            },
          },
        });
        registerSchema(PLUGIN_TYPE, 'arrayarg', {
          type: 'object',
          properties: {
            arr: {
              type: 'array',
              default: [],
            },
          },
        });
        finalizeSchema();
      });

      describe('when args are not present', function () {
        it('the `cliArgs` prop should be an empty object', function () {
          const appium = new AppiumDriver({} as any);
          appium.pluginClasses = new Map([
            [NoArgsPlugin, 'noargs'],
            [ArgsPlugin, 'args'],
          ]);
          for (const plugin of appium.createPluginInstances()) {
            expect(plugin.cliArgs).to.eql({});
          }
        });
      });

      describe('when args are equal to the schema defaults', function () {
        it('the `cliArgs` prop should contain the schema defaults', function () {
          const appium = new AppiumDriver({plugin: {args: {randomArg: 2000}}} as any);
          appium.pluginClasses = new Map([
            [NoArgsPlugin, 'noargs'],
            [ArgsPlugin, 'args'],
          ]);
          const [noargs, args] = appium.createPluginInstances();
          expect(noargs.cliArgs).to.eql({});
          expect(args.cliArgs).to.eql({randomArg: 2000});
        });

        describe('when the default is an "object"', function () {
          it('the `cliArgs` prop should contain the schema defaults', function () {
            const appium = new AppiumDriver({plugin: {arrayarg: {arr: []}}} as any);
            appium.pluginClasses = new Map([
              [NoArgsPlugin, 'noargs'],
              [ArgsPlugin, 'args'],
              [ArrayArgPlugin, 'arrayarg'],
            ]);
            const [noargs, args, arrayarg] = appium.createPluginInstances();
            expect(noargs.cliArgs).to.eql({});
            expect(args.cliArgs).to.eql({});
            expect(arrayarg.cliArgs).to.eql({arr: []});
          });
        });
      });

      describe('when args are not equal to the schema defaults', function () {
        it('should add cliArgs to the plugin', function () {
          const appium = new AppiumDriver({plugin: {args: {randomArg: 1234}}} as any);
          appium.pluginClasses = new Map([[ArgsPlugin, 'args']]);
          const plugin = _.first(appium.createPluginInstances()) as BasePlugin;
          expect(plugin.cliArgs).to.eql({randomArg: 1234});
        });
      });
    });
  });
});
