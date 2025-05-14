// @ts-check

import {PLUGIN_TYPE, SESSION_DISCOVERY_FEATURE} from '../../lib/constants';
import B from 'bluebird';
import {BaseDriver} from '@appium/base-driver';
import {FakeDriver} from '@appium/fake-driver';
import {sleep} from 'asyncbox';
import _ from 'lodash';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';
import {finalizeSchema, registerSchema, resetSchema} from '../../lib/schema/schema';
import {insertAppiumPrefixes, removeAppiumPrefixes} from '../../lib/utils';
import {rewiremock, BASE_CAPS, W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers';
import {BasePlugin} from '@appium/base-plugin';

const SESSION_ID = '1';
const SESSION_DISCOVERY_ENABLED = {allowInsecure: [`*:${SESSION_DISCOVERY_FEATURE}`]};

describe('AppiumDriver', function () {
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  /** @type {typeof import('appium/lib/appium').AppiumDriver} */
  let AppiumDriver;

  /** @type {MockConfig} */
  let MockConfig;
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

  beforeEach(function () {
    sandbox = createSandbox();
    resetSchema();
    finalizeSchema();

    MockConfig = {
      getBuildInfo: /** @type {MockConfig['getBuildInfo']} */ (
        sandbox.stub().callsFake(() => ({version: MockConfig.APPIUM_VER}))
      ),
      updateBuildInfo: /** @type {MockConfig['updateBuildInfo']} */ (sandbox.stub().resolves()),
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
      const debugStrub = sandbox.stub(ad._log, 'debug');
      // finally, wait for `updateBuildInfo()` to finish up
      await promise;
      debugStrub.calledOnce.should.be.true;
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
    function getDriverAndFakeDriver(appiumArgs = {}, DriverClass = FakeDriver) {
      const appium = new AppiumDriver(appiumArgs);
      fakeDriver = new DriverClass();
      const mockFakeDriver = sandbox.mock(fakeDriver);
      const mockedDriverReturnerClass = function Driver() {
        return fakeDriver;
      };

      appium.driverConfig = {
        findMatchingDriver: sandbox.stub().returns({
          driver: mockedDriverReturnerClass,
          version: '1.2.3',
          driverName: 'fake',
        }),
      };

      return [appium, mockFakeDriver];
    }
    describe('configureGlobalFeatures', function () {
      /** @type {AppiumDriver} */
      let appium;

      /**
       * @param {import('@appium/types').DriverOpts<import('../../lib/appium').AppiumDriverConstraints>} cliArgs
       */
      function createDriver(cliArgs) {
        appium = new AppiumDriver(cliArgs);
        appium.configureGlobalFeatures();
      };
      it('should not allow insecure features by default', function () {
        createDriver({});
        appium.allowInsecure.should.be.empty;
        appium.denyInsecure.should.be.empty;
        appium.relaxedSecurityEnabled.should.be.false;
      });
      it('should allow insecure features', function () {
        createDriver({allowInsecure: ['foo:bar']});
        appium.allowInsecure.should.eql(['foo:bar']);
      });
      it('should deny insecure features', function () {
        createDriver({denyInsecure: ['foo:baz']});
        appium.denyInsecure.should.eql(['foo:baz']);
      });
      it('should allow relaxed security', function () {
        createDriver({relaxedSecurityEnabled: true});
        appium.relaxedSecurityEnabled.should.be.true;
      });
      it('should ignore allowed features in combination with relaxed security', function () {
        createDriver({
          allowInsecure: ['foo:bar'],
          relaxedSecurityEnabled: true,
        });
        appium.allowInsecure.should.be.empty;
        appium.relaxedSecurityEnabled.should.be.true;
      });
    });
    describe('createSession', function () {
      /** @type {AppiumDriver} */
      let appium;
      /** @type {sinon.SinonMock} */
      let mockFakeDriver;
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
        let defaultCaps = {'appium:someCap': 'hello'};
        let allCaps = {
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
        let defaultCaps = {platformName: 'Ersatz'};
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
        let fakeDrivers = [new FakeDriver(), new FakeDriver(), new FakeDriver()];
        let mockFakeDrivers = _.map(fakeDrivers, (fd) => sandbox.mock(fd));
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
        sessions.should.have.length(3);

        mockFakeDriver
          .expects('createSession')
          .once()
          .withExactArgs(W3C_CAPS, W3C_CAPS, W3C_CAPS, [])
          .returns([SESSION_ID, removeAppiumPrefixes(W3C_PREFIXED_CAPS)]);
        await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);

        sessions = await appium.getAppiumSessions();
        sessions.should.have.length(1);

        for (let mfd of mockFakeDrivers) {
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
        /** @type {import('@appium/types').W3CCapabilities} */
        let w3cCaps = {
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
        class ArgsDriver extends BaseDriver {}
        const args = {driver: {fake: {randomArg: 1234}}};
        [appium, mockFakeDriver] = getDriverAndFakeDriver(args, ArgsDriver);
        const {value} = await appium.createSession(W3C_CAPS, W3C_CAPS, W3C_CAPS);
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
        [appium, mockFakeDriver] = getDriverAndFakeDriver(SESSION_DISCOVERY_ENABLED);
      });
      afterEach(function () {
        mockFakeDriver.restore();
      });
      it('should remove the session if it is found', async function () {
        appium.configureGlobalFeatures();
        let [sessionId] = (await appium.createSession(null, null, W3C_CAPS)).value;
        let sessions = await appium.getAppiumSessions();
        sessions.should.have.length(1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getAppiumSessions();
        sessions.should.have.length(0);
      });
      it("should call inner driver's deleteSession method", async function () {
        const [sessionId] = (await appium.createSession(null, null, W3C_CAPS)).value;
        mockFakeDriver.expects('deleteSession').once().withExactArgs(sessionId, []).returns();
        await appium.deleteSession(sessionId);
        mockFakeDriver.verify();

        // cleanup, since we faked the delete session call
        await mockFakeDriver.object.deleteSession();
      });
    });
    describe('configureDriverFeatures', function () {
      /** @type {AppiumDriver} */
      let appium;

      /**
       *
       * @param {import('@appium/types').DriverOpts<import('../../lib/appium').AppiumDriverConstraints>} appiumArgs
       * @returns {Promise<FakeDriver>}
       */
      async function getDriverInstance(appiumArgs) {
        appium = new AppiumDriver(appiumArgs);
        appium.configureGlobalFeatures();
        const fakeDriver = new FakeDriver();
        const mockFakeDriver = sandbox.mock(fakeDriver);
        const mockedDriverReturnerClass = function Driver() {
          return fakeDriver;
        };

        appium.driverConfig = {
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
        await appium.createSession(undefined, null, W3C_CAPS);

        return fakeDriver;
      }
      afterEach(async function () {
        await appium.deleteSession(SESSION_ID);
      });
      it(`should not apply any insecure features by default`, async function () {
        fakeDriver = await getDriverInstance({});
        fakeDriver.allowInsecure.should.be.empty;
        fakeDriver.denyInsecure.should.be.empty;
        fakeDriver.relaxedSecurityEnabled.should.be.false;
      });
      it(`should apply relaxed security`, async function () {
        fakeDriver = await getDriverInstance({relaxedSecurityEnabled: true});;
        fakeDriver.relaxedSecurityEnabled.should.be.true;
      });
      it(`should apply global-scope insecure features`, async function () {
        fakeDriver = await getDriverInstance({
          allowInsecure: ['*:foo'],
          denyInsecure: ['*:bar'],
        });
        fakeDriver.allowInsecure.should.eql(['*:foo']);
        fakeDriver.denyInsecure.should.eql(['*:bar']);
      });
      it(`should apply driver-scope insecure features only if the driver name matches`, async function () {
        fakeDriver = await getDriverInstance({allowInsecure: ['fake:foo', 'real:bar']});
        fakeDriver.allowInsecure.should.eql(['fake:foo']);
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
        for (let session of sessions) {
          await appium.deleteSession(session.id);
        }
        mockFakeDriver.restore();
      });
      it('should return an empty array of sessions', async function () {
        sessions = await appium.getAppiumSessions();
        sessions.should.be.an('array');
        sessions.should.be.empty;
      });
      it('should return sessions created', async function () {
        let caps1 = {
          alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'value'},
        };
        let caps2 = {
          alwaysMatch: {...W3C_PREFIXED_CAPS, 'appium:cap': 'other value'},
        };
        mockFakeDriver
          .expects('createSession')
          .once()
          .returns(['fake-session-id-1', removeAppiumPrefixes(caps1.alwaysMatch)]);
        let [session1Id, session1Caps] = (await appium.createSession(null, null, caps1)).value;
        mockFakeDriver
          .expects('createSession')
          .once()
          .returns(['fake-session-id-2', removeAppiumPrefixes(caps2.alwaysMatch)]);
        let [session2Id, session2Caps] = (await appium.createSession(null, null, caps2)).value;

        sessions = await appium.getAppiumSessions();
        sessions.should.be.an('array');
        sessions.should.have.length(2);
        sessions[0].id.should.equal(session1Id);
        sessions[0].should.have.property('created');
        removeAppiumPrefixes(caps1.alwaysMatch).should.eql(session1Caps);
        sessions[1].id.should.equal(session2Id);
        sessions[1].should.have.property('created');
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
    describe('sessionExists', function () {});
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
        let [sessionId] = (await appium.createSession(null, null, _.clone(W3C_CAPS))).value;
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown', new Error('Oops'));
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
      it('should remove session if inner driver unexpectedly exits with no error', async function () {
        let [sessionId] = (await appium.createSession(null, null, _.clone(W3C_CAPS))).value;
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].eventEmitter.emit('onUnexpectedShutdown');
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
    });
    describe('createPluginInstances', function () {
      class NoArgsPlugin extends BasePlugin {}
      NoArgsPlugin.baseVersion = '1.0';

      class ArgsPlugin extends BasePlugin {}
      ArgsPlugin.baseVersion = '1.0';

      class ArrayArgPlugin extends BasePlugin {}
      ArrayArgPlugin.baseVersion = '1.0';

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
          const appium = new AppiumDriver({});
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
          const appium = new AppiumDriver({
            plugin: {args: {randomArg: 2000}},
          });
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
            const appium = new AppiumDriver({
              plugin: {arrayarg: {arr: []}},
            });
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
          const appium = new AppiumDriver({plugin: {args: {randomArg: 1234}}});
          appium.pluginClasses = new Map([[ArgsPlugin, 'args']]);
          const plugin = _.first(appium.createPluginInstances());
          plugin.cliArgs.should.eql({randomArg: 1234});
        });
      });
    });
  });
});

/**
 * @typedef {import('appium/lib/config')} ConfigModule
 * @typedef {import('appium/lib/appium').AppiumDriver} AppiumDriver
 */

/**
 * Mocks some stuff in `lib/config`
 * @typedef MockConfig
 * @property {import('sinon').SinonStubbedMember<ConfigModule['getBuildInfo']>} getBuildInfo
 * @property {import('sinon').SinonStubbedMember<ConfigModule['updateBuildInfo']>} updateBuildInfo
 * @property {string} APPIUM_VER
 */
