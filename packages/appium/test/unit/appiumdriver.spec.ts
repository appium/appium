import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach, before, after, mock} from 'node:test';

import {BaseDriver} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import {FakeDriver} from '@appium/fake-driver';
import type {Capabilities, Constraints, NSCapabilities, W3CCapabilities} from '@appium/types';
import {sleep} from 'asyncbox';
import type {SinonMock, SinonSandbox, SinonStubbedMember} from 'sinon';
import {createSandbox, stub} from 'sinon';

import type * as AppiumModule from '../../lib/appium.js';
import {PLUGIN_TYPE, SESSION_DISCOVERY_FEATURE} from '../../lib/constants.js';
import * as buildInfoModule from '../../lib/helpers/build.js';
import {insertAppiumPrefixes, removeAppiumPrefixes} from '../../lib/helpers/capability.js';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema.js';
import {BASE_CAPS, W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers.js';

interface MockConfigShape {
  getBuildInfo: SinonStubbedMember<() => {version: string}>;
  updateBuildInfo: SinonStubbedMember<() => Promise<void>>;
  APPIUM_VER: string;
}

const SESSION_ID = '1';
const SESSION_DISCOVERY_ENABLED = {allowInsecure: [`*:${SESSION_DISCOVERY_FEATURE}`]};

/**
 * Fills the umbrella driver's plugin map without replacing the readonly `pluginClasses` reference.
 */
function setPluginClassesForTest(appium: {pluginClasses: Map<any, string>}, classes: Map<any, string>): void {
  appium.pluginClasses.clear();
  for (const [cls, name] of classes) {
    appium.pluginClasses.set(cls, name);
  }
}

describe('AppiumDriver', function () {
  let sandbox: SinonSandbox;
  let AppiumDriver: typeof AppiumModule.AppiumDriver;
  let MockConfig: MockConfigShape;
  let importCounter = 0;

  // `MockConfig`'s stub functions are created once (stable identity for `mock.module`, which
  // throws if re-registered) and reconfigured per test via sinon; `AppiumDriver` is
  // re-imported fresh (cache-busted) every test to reset its own per-class state.
  before(function () {
    MockConfig = {
      getBuildInfo: undefined as unknown as MockConfigShape['getBuildInfo'],
      updateBuildInfo: undefined as unknown as MockConfigShape['updateBuildInfo'],
      APPIUM_VER: '2.0',
    };
    MockConfig.getBuildInfo = stub().callsFake(() => ({
      version: MockConfig.APPIUM_VER,
    })) as MockConfigShape['getBuildInfo'];
    MockConfig.updateBuildInfo = stub().resolves() as MockConfigShape['updateBuildInfo'];
    mock.module('../../lib/helpers/build.js', {
      namedExports: {
        ...buildInfoModule,
        getBuildInfo: MockConfig.getBuildInfo,
        updateBuildInfo: MockConfig.updateBuildInfo,
        APPIUM_VER: MockConfig.APPIUM_VER,
      },
    });
  });

  after(function () {
    mock.reset();
  });

  beforeEach(async function () {
    sandbox = createSandbox();
    resetSchema();
    await finalizeSchema();

    MockConfig.getBuildInfo.resetHistory();
    MockConfig.getBuildInfo.resetBehavior();
    MockConfig.getBuildInfo.callsFake(() => ({version: MockConfig.APPIUM_VER}));
    MockConfig.updateBuildInfo.resetHistory();
    MockConfig.updateBuildInfo.resetBehavior();
    MockConfig.updateBuildInfo.resolves();

    ({AppiumDriver} = await import(`../../lib/appium.js?t=${importCounter++}`));
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
      assert.strictEqual(debugStrub.calledOnce, true);
    });
  });

  describe('instance method', function () {
    let fakeDriver: FakeDriver;

    function getDriverAndFakeDriver(
      appiumArgs: any = {},
      DriverClass: typeof FakeDriver = FakeDriver,
    ): [InstanceType<typeof AppiumModule.AppiumDriver>, SinonMock] {
      const appium = new AppiumDriver(appiumArgs);
      fakeDriver = new DriverClass();
      const mockFakeDriver = sandbox.mock(fakeDriver);
      const mockedDriverReturnerClass = function Driver() {
        return fakeDriver;
      };

      // stub does not satisfy DriverConfig typing
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
      }
      it('should not allow insecure features by default', function () {
        createDriver({} as any);
        assert.strictEqual(appium.allowInsecure.length, 0);
        assert.strictEqual(appium.denyInsecure.length, 0);
        assert.strictEqual(appium.relaxedSecurityEnabled, false);
      });
      it('should allow insecure features', function () {
        createDriver({allowInsecure: ['foo:bar']} as any);
        assert.deepStrictEqual(appium.allowInsecure, ['foo:bar']);
      });
      it('should deny insecure features', function () {
        createDriver({denyInsecure: ['foo:baz']} as any);
        assert.deepStrictEqual(appium.denyInsecure, ['foo:baz']);
      });
      it('should allow relaxed security', function () {
        createDriver({relaxedSecurityEnabled: true} as any);
        assert.strictEqual(appium.relaxedSecurityEnabled, true);
      });
      it('should ignore allowed features in combination with relaxed security', function () {
        createDriver({
          allowInsecure: ['foo:bar'],
          relaxedSecurityEnabled: true,
        } as any);
        assert.strictEqual(appium.allowInsecure.length, 0);
        assert.strictEqual(appium.relaxedSecurityEnabled, true);
      });
    });
    describe('createSession', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: SinonMock;
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
          .withExactArgs(W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS as NSCapabilities<Constraints>)]);
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
          .withArgs(allCaps)
          .returns([SESSION_ID, removeAppiumPrefixes(allCaps.alwaysMatch as NSCapabilities<Constraints>)]);
        await appium.createSession(W3C_CAPS);
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
          .withArgs(W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS as NSCapabilities<Constraints>)]);
        await appium.createSession(W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should kill all other sessions if sessionOverride is on', async function () {
        appium.configureGlobalFeatures();
        appium.args.sessionOverride = true;

        // mock three sessions that should be removed when the new one is created
        const fakeDrivers = [new FakeDriver(), new FakeDriver(), new FakeDriver()];
        const mockFakeDrivers = fakeDrivers.map((fd) => sandbox.mock(fd));
        mockFakeDrivers[0].expects('deleteSession').once();
        mockFakeDrivers[1]
          .expects('deleteSession')
          .once()
          .throws('Cannot shut down Android driver; it has already shut down');
        mockFakeDrivers[2].expects('deleteSession').once();
        (appium as any).sessions['abc-123-xyz'] = fakeDrivers[0];
        (appium as any).sessions['xyz-321-abc'] = fakeDrivers[1];
        (appium as any).sessions['123-abc-xyz'] = fakeDrivers[2];

        let sessions = await appium.getAppiumSessions();
        assert.strictEqual(sessions.length, 3);

        mockFakeDriver
          .expects('createSession')
          .once()
          .withExactArgs(W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS as NSCapabilities<Constraints>)]);
        await appium.createSession(W3C_CAPS);

        sessions = await appium.getAppiumSessions();
        assert.strictEqual(sessions.length, 1);

        for (const mfd of mockFakeDrivers) {
          mfd.verify();
        }
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument, if provided', async function () {
        mockFakeDriver
          .expects('createSession')
          .once()
          .withArgs(W3C_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(W3C_CAPS);
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
          .withArgs(expectedCaps)
          .returns([SESSION_ID, insertAppiumPrefixes(BASE_CAPS as Capabilities<Constraints>)]);

        await appium.createSession(w3cCaps);
        mockFakeDriver.verify();
      });

      it('should assign args to property `cliArgs`', async function () {
        class ArgsDriver extends BaseDriver<Constraints> {}
        const args = {driver: {fake: {randomArg: 1234}}};
        [appium, mockFakeDriver] = getDriverAndFakeDriver(args, ArgsDriver as typeof FakeDriver);
        const {value} = await appium.createSession(W3C_CAPS);
        try {
          assert.deepStrictEqual(fakeDriver.cliArgs, {randomArg: 1234});
        } finally {
          await appium.deleteSession(value![0]);
        }
      });
    });
    describe('deleteSession', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: SinonMock;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver(SESSION_DISCOVERY_ENABLED);
      });
      afterEach(function () {
        mockFakeDriver.restore();
      });
      it('should remove the session if it is found', async function () {
        appium.configureGlobalFeatures();
        const [sessionId] = (await appium.createSession(W3C_CAPS)).value!;
        let sessions = await appium.getAppiumSessions();
        assert.strictEqual(sessions.length, 1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getAppiumSessions();
        assert.strictEqual(sessions.length, 0);
      });
      it("should call inner driver's deleteSession method", async function () {
        const [sessionId] = (await appium.createSession(W3C_CAPS)).value!;
        mockFakeDriver.expects('deleteSession').once().withExactArgs(sessionId).returns(undefined);
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

        // stub does not satisfy DriverConfig typing
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
          .withExactArgs(W3C_CAPS)
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS as NSCapabilities<Constraints>)]);
        await appium.createSession(W3C_CAPS);

        return fakeDriver;
      }
      afterEach(async function () {
        await appium.deleteSession(SESSION_ID);
      });
      it(`should not apply any insecure features by default`, async function () {
        fakeDriver = await getDriverInstance({});
        assert.strictEqual(fakeDriver.allowInsecure.length, 0);
        assert.strictEqual(fakeDriver.denyInsecure.length, 0);
        assert.strictEqual(fakeDriver.relaxedSecurityEnabled, false);
      });
      it(`should apply relaxed security`, async function () {
        fakeDriver = await getDriverInstance({relaxedSecurityEnabled: true});
        assert.strictEqual(fakeDriver.relaxedSecurityEnabled, true);
      });
      it(`should apply global-scope insecure features`, async function () {
        fakeDriver = await getDriverInstance({
          allowInsecure: ['*:foo'],
          denyInsecure: ['*:bar'],
        });
        assert.deepStrictEqual(fakeDriver.allowInsecure, ['*:foo']);
        assert.deepStrictEqual(fakeDriver.denyInsecure, ['*:bar']);
      });
      it(`should apply driver-scope insecure features only if the driver name matches`, async function () {
        fakeDriver = await getDriverInstance({allowInsecure: ['fake:foo', 'real:bar']});
        assert.deepStrictEqual(fakeDriver.allowInsecure, ['fake:foo']);
      });
    });
    describe('getAppiumSessions', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: SinonMock;
      let sessions: Awaited<ReturnType<InstanceType<typeof AppiumModule.AppiumDriver>['getAppiumSessions']>>;
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
        assert.ok(Array.isArray(sessions));
        assert.strictEqual(sessions.length, 0);
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
          .returns(['fake-session-id-1', removeAppiumPrefixes(caps1.alwaysMatch as NSCapabilities<Constraints>)]);
        const [session1Id, session1Caps] = (await appium.createSession(caps1 as any)).value!;
        mockFakeDriver
          .expects('createSession')
          .once()
          .returns(['fake-session-id-2', removeAppiumPrefixes(caps2.alwaysMatch as NSCapabilities<Constraints>)]);
        const [session2Id, session2Caps] = (await appium.createSession(caps2 as any)).value!;

        sessions = await appium.getAppiumSessions();
        assert.ok(Array.isArray(sessions));
        assert.strictEqual(sessions.length, 2);
        assert.strictEqual(sessions[0].id, session1Id);
        assert.ok(Object.hasOwn(sessions[0], 'created'));
        assert.deepStrictEqual(removeAppiumPrefixes(caps1.alwaysMatch as NSCapabilities<Constraints>), session1Caps);
        assert.strictEqual(sessions[1].id, session2Id);
        assert.ok(Object.hasOwn(sessions[1], 'created'));
        assert.deepStrictEqual(removeAppiumPrefixes(caps2.alwaysMatch as NSCapabilities<Constraints>), session2Caps);
      });
    });
    describe('getStatus', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      before(function () {
        appium = new AppiumDriver({} as any);
      });
      it('should return a status', async function () {
        const status = await appium.getStatus();
        assert.ok(status.build);
        assert.ok(status.build.version);
      });
    });
    describe('sessionExists', function () {});
    describe('attachUnexpectedShutdownHandler', function () {
      let appium: InstanceType<typeof AppiumModule.AppiumDriver>;
      let mockFakeDriver: SinonMock;
      beforeEach(function () {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async function () {
        await (mockFakeDriver as any).object.deleteSession();
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });

      it('should remove session if inner driver unexpectedly exits with an error', async function () {
        const [sessionId] = (await appium.createSession(structuredClone(W3C_CAPS))).value!;
        assert.ok(Object.keys(appium.sessions).includes(sessionId));
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown', new Error('Oops'));
        // let event loop spin so rejection is handled
        await sleep(1);
        assert.ok(!Object.keys(appium.sessions).includes(sessionId));
      });
      it('should remove session if inner driver unexpectedly exits with no error', async function () {
        const [sessionId] = (await appium.createSession(structuredClone(W3C_CAPS))).value!;
        assert.ok(Object.keys(appium.sessions).includes(sessionId));
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown');
        // let event loop spin so rejection is handled
        await sleep(1);
        assert.ok(!Object.keys(appium.sessions).includes(sessionId));
      });
    });
    describe('createPluginInstances', function () {
      class NoArgsPlugin extends BasePlugin {}
      (NoArgsPlugin as any).baseVersion = '1.0';

      class ArgsPlugin extends BasePlugin {}
      (ArgsPlugin as any).baseVersion = '1.0';

      class ArrayArgPlugin extends BasePlugin {}
      (ArrayArgPlugin as any).baseVersion = '1.0';

      beforeEach(async function () {
        resetSchema();
        // to establish defaults, we need to register a schema for the plugin.
        // note that the `noargs` plugin does not need a schema, because it
        // accepts no arguments.
        await registerSchema(PLUGIN_TYPE, 'args', {
          type: 'object',
          properties: {
            randomArg: {
              type: 'number',
              default: 2000,
            },
          },
        });
        await registerSchema(PLUGIN_TYPE, 'arrayarg', {
          type: 'object',
          properties: {
            arr: {
              type: 'array',
              default: [],
            },
          },
        });
        await finalizeSchema();
      });

      describe('when args are not present', function () {
        it('the `cliArgs` prop should be an empty object', function () {
          const appium = new AppiumDriver({} as any);
          setPluginClassesForTest(
            appium,
            new Map<any, string>([
              [NoArgsPlugin, 'noargs'],
              [ArgsPlugin, 'args'],
            ]),
          );
          for (const plugin of appium.createPluginInstances()) {
            assert.deepStrictEqual(plugin.cliArgs, {});
          }
        });
      });

      describe('when args are equal to the schema defaults', function () {
        it('the `cliArgs` prop should contain the schema defaults', function () {
          const appium = new AppiumDriver({plugin: {args: {randomArg: 2000}}} as any);
          setPluginClassesForTest(
            appium,
            new Map<any, string>([
              [NoArgsPlugin, 'noargs'],
              [ArgsPlugin, 'args'],
            ]),
          );
          const [noargs, args] = appium.createPluginInstances();
          assert.deepStrictEqual(noargs.cliArgs, {});
          assert.deepStrictEqual(args.cliArgs, {randomArg: 2000});
        });

        describe('when the default is an "object"', function () {
          it('the `cliArgs` prop should contain the schema defaults', function () {
            const appium = new AppiumDriver({plugin: {arrayarg: {arr: []}}} as any);
            setPluginClassesForTest(
              appium,
              new Map<any, string>([
                [NoArgsPlugin, 'noargs'],
                [ArgsPlugin, 'args'],
                [ArrayArgPlugin, 'arrayarg'],
              ]),
            );
            const [noargs, args, arrayarg] = appium.createPluginInstances();
            assert.deepStrictEqual(noargs.cliArgs, {});
            assert.deepStrictEqual(args.cliArgs, {});
            assert.deepStrictEqual(arrayarg.cliArgs, {arr: []});
          });
        });
      });

      describe('when args are not equal to the schema defaults', function () {
        it('should add cliArgs to the plugin', function () {
          const appium = new AppiumDriver({plugin: {args: {randomArg: 1234}}} as any);
          setPluginClassesForTest(appium, new Map<any, string>([[ArgsPlugin, 'args']]));
          const plugin = appium.createPluginInstances()[0] as BasePlugin;
          assert.deepStrictEqual(plugin.cliArgs, {randomArg: 1234});
        });
      });
    });

    describe('pluginsForSession', function () {
      it('should cache plugin instances per existing session', function () {
        const appium = new AppiumDriver({} as any);
        const fakeDriver = new FakeDriver();
        (appium as any).sessions[SESSION_ID] = fakeDriver;

        const createPluginInstancesSpy = sandbox.spy(appium, 'createPluginInstances');
        const firstPlugins = appium.pluginsForSession(SESSION_ID);
        const secondPlugins = appium.pluginsForSession(SESSION_ID);

        assert.strictEqual(firstPlugins, secondPlugins);
        assert.strictEqual(appium.sessionPlugins[SESSION_ID], firstPlugins);
        assert.strictEqual(createPluginInstancesSpy.calledOnce, true);
      });
    });
  });
});
