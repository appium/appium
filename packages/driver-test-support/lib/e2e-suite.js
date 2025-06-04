import _ from 'lodash';
import {server, routeConfiguringFunction, DeviceSettings} from 'appium/driver';
import axios from 'axios';
import B from 'bluebird';
import {TEST_HOST, getTestPort, createAppiumURL} from './helpers';
import sinon from 'sinon';
import {Agent} from 'node:http';

/**
 * Creates some helper functions for E2E tests to manage sessions.
 * @template [CommandData=unknown]
 * @template [ResponseData=any]
 * @param {number} port - Port on which the server is running. Typically this will be retrieved via `get-port` beforehand
 * @param {string} [address] - Address/host on which the server is running. Defaults to {@linkcode TEST_HOST}
 * @returns {SessionHelpers<CommandData, ResponseData>}
 */
export function createSessionHelpers(port, address = TEST_HOST) {
  const createAppiumTestURL =
    /** @type {import('lodash').CurriedFunction2<string,string,string>} */ (
      createAppiumURL(address, port)
    );

  const createSessionURL = createAppiumTestURL(_, '');
  const newSessionURL = createAppiumTestURL('', 'session');
  return /** @type {SessionHelpers<CommandData, ResponseData>} */ ({
    newSessionURL,
    createAppiumTestURL,
    /**
     *
     * @param {string} sessionId
     * @param {string} cmdName
     * @param {any} [data]
     * @param {RawAxiosRequestConfig} [config]
     * @returns {Promise<any>}
     */
    postCommand: async (sessionId, cmdName, data = {}, config = {}) => {
      const url = createAppiumTestURL(sessionId, cmdName);
      const response = await axios.post(url, data, config);
      return response.data?.value;
    },
    /**
     *
     * @param {string} sessionIdOrCmdName
     * @param {string|RawAxiosRequestConfig} cmdNameOrConfig
     * @param {RawAxiosRequestConfig} [config]
     * @returns {Promise<any>}
     */
    getCommand: async (sessionIdOrCmdName, cmdNameOrConfig, config = {}) => {
      if (!_.isString(cmdNameOrConfig)) {
        config = cmdNameOrConfig;
        cmdNameOrConfig = sessionIdOrCmdName;
        sessionIdOrCmdName = '';
      }
      const response = await axios({
        url: createAppiumTestURL(sessionIdOrCmdName, cmdNameOrConfig),
        validateStatus: null,
        ...config,
      });
      return response.data?.value;
    },
    /**
     *
     * @param {NewSessionData} data
     * @param {RawAxiosRequestConfig} [config]
     */
    startSession: async (data, config = {}) => {
      data = _.defaultsDeep(data, {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{}],
        },
      });
      const response = await axios.post(newSessionURL, data, config);
      return response.data?.value;
    },
    /**
     *
     * @param {string} sessionId
     */
    endSession: async (sessionId) =>
      await axios.delete(createSessionURL(sessionId), {
        validateStatus: null,
      }),
    /**
     * @param {string} sessionId
     * @returns {Promise<any>}
     */
    getSession: async (sessionId) => {
      const response = await axios({
        url: createSessionURL(sessionId),
        validateStatus: null,
      });
      return response.data?.value;
    },
  });
}

/**
 * Creates E2E test suites for a driver.
 * @param {DriverClass} DriverClass
 * @param {Partial<BaseNSCapabilities>} [defaultCaps]
 */
export function driverE2ETestSuite(DriverClass, defaultCaps = {}) {
  let address = defaultCaps['appium:address'] ?? TEST_HOST;
  let port = defaultCaps['appium:port'];
  const className = DriverClass.name || '(unknown driver)';

  describe(`BaseDriver E2E (as ${className})`, function () {
    let baseServer;
    /** @type {Driver} */
    let d;
    /**
     * This URL creates a new session
     * @type {string}
     **/
    let newSessionURL;

    /** @type {SessionHelpers['startSession']} */
    let startSession;
    /** @type {SessionHelpers['getSession']} */
    let getSession;
    /** @type {SessionHelpers['endSession']} */
    let endSession;
    /** @type {SessionHelpers['getCommand']} */
    let getCommand;
    /** @type {SessionHelpers['postCommand']} */
    let postCommand;
    let expect;
    let should;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      chai.use(chaiAsPromised.default);
      expect = chai.expect;
      should = chai.should();

      port = port ?? (await getTestPort());
      defaultCaps = {...defaultCaps};
      d = new DriverClass({port, address});
      baseServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(d),
        port,
        hostname: address,
        // @ts-expect-error
        cliArgs: {},
      });
      ({startSession, getSession, endSession, newSessionURL, getCommand, postCommand} =
        createSessionHelpers(port, address));
    });
    after(async function () {
      await baseServer?.close();
    });

    describe('session handling', function () {
      it('should handle idempotency while creating sessions', async function () {
        // workaround for https://github.com/node-fetch/node-fetch/issues/1735
        const httpAgent = new Agent({keepAlive: true});

        const sessionIds = [];
        let times = 0;
        do {
          const {sessionId} = await startSession(
            {
              capabilities: {alwaysMatch: defaultCaps},
            },
            {
              headers: {
                'X-Idempotency-Key': '123456',
              },
              httpAgent,
            }
          );

          sessionIds.push(sessionId);
          times++;
        } while (times < 2);
        should(_.uniq(sessionIds).length).equal(1);

        const {status, data} = await endSession(sessionIds[0]);
        should(status).equal(200);
        should.equal(data.value, null);
      });

      it('should handle idempotency while creating parallel sessions', async function () {
        // workaround for https://github.com/node-fetch/node-fetch/issues/1735
        const httpAgent = new Agent({keepAlive: true});

        const reqs = [];
        let times = 0;
        do {
          reqs.push(
            startSession(
              {
                capabilities: {
                  alwaysMatch: defaultCaps,
                },
              },
              {
                headers: {
                  'X-Idempotency-Key': '12345',
                },
                httpAgent,
              }
            )
          );
          times++;
        } while (times < 2);
        const sessionIds = _.map(await B.all(reqs), 'sessionId');
        should(_.uniq(sessionIds).length).equal(1);

        const {status, data} = await endSession(sessionIds[0]);
        should(status).equal(200);
        should.equal(data.value, null);
      });

      it('should create session and retrieve a session id, then delete it', async function () {
        let {status, data} = await axios.post(newSessionURL, {
          capabilities: {
            alwaysMatch: defaultCaps,
          },
        });

        should(status).equal(200);
        should.exist(data.value.sessionId);
        should(data.value.capabilities.platformName).equal(defaultCaps.platformName);
        should(data.value.capabilities.deviceName).equal(defaultCaps['appium:deviceName']);

        ({status, data} = await endSession(/** @type {string} */ (d.sessionId)));

        should(status).equal(200);
        should.equal(data.value, null);
        should.equal(d.sessionId, null);
      });
    });

    it.skip('should throw NYI for commands not implemented', async function () {});

    describe('command timeouts', function () {
      let originalFindElement, originalFindElements;

      /**
       * @param {number} [timeout]
       */
      async function startTimeoutSession(timeout) {
        const caps = _.cloneDeep(defaultCaps);
        caps['appium:newCommandTimeout'] = timeout;
        return await startSession({capabilities: {alwaysMatch: caps}});
      }

      before(function () {
        originalFindElement = d.findElement;
        d.findElement = function () {
          return 'foo';
        }.bind(d);

        originalFindElements = d.findElements;
        d.findElements = async function () {
          await B.delay(200);
          return ['foo'];
        }.bind(d);
      });

      after(function () {
        d.findElement = originalFindElement;
        d.findElements = originalFindElements;
      });

      it('should set a default commandTimeout', async function () {
        let newSession = await startTimeoutSession();
        should(d.newCommandTimeoutMs).be.above(0);
        await endSession(newSession.sessionId);
      });

      it('should timeout on commands using commandTimeout cap', async function () {
        let newSession = await startTimeoutSession(0.25);
        const sessionId = /** @type {string} */ (d.sessionId);
        await postCommand(sessionId, 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(sessionId);
        should.equal(value.error, 'invalid session id');
        should.equal(d.sessionId, null);
        const resp = (await endSession(newSession.sessionId)).data.value;
        should.equal(resp?.error, 'invalid session id');
      });

      it('should not timeout with commandTimeout of false', async function () {
        let newSession = await startTimeoutSession(0.1);
        let start = Date.now();
        const value = await postCommand(/** @type {string} */ (d.sessionId), 'elements', {
          using: 'name',
          value: 'foo',
        });
        should(Date.now() - start).be.above(150);
        should(value).eql(['foo']);
        await endSession(newSession.sessionId);
      });

      it('should not timeout with commandTimeout of 0', async function () {
        d.newCommandTimeoutMs = 2;
        let newSession = await startTimeoutSession(0);

        await postCommand(/** @type {string} */ (d.sessionId), 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(/** @type {string} */ (d.sessionId));
        should(value.platformName).equal(defaultCaps.platformName);
        const resp = (await endSession(newSession.sessionId)).data.value;
        should.equal(resp, null);

        d.newCommandTimeoutMs = 60 * 1000;
      });

      it('should not timeout if its just the command taking awhile', async function () {
        let newSession = await startTimeoutSession(0.25);
        // XXX: race condition: we must build this URL before ...something happens...
        // which causes `d.sessionId` to be missing
        const {sessionId} = d;

        await postCommand(/** @type {string} */ (d.sessionId), 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(/** @type {string} */ (sessionId));
        should(/** @type {string} */ (value.error)).equal('invalid session id');
        should.equal(d.sessionId, null);
        const resp = (await endSession(newSession.sessionId)).data.value;
        should(/** @type {string} */ (/** @type { {error: string} } */ (resp).error)).equal(
          'invalid session id'
        );
      });

      it('should not have a timer running before or after a session', async function () {
        // @ts-expect-error
        should.not.exist(d.noCommandTimer);
        let newSession = await startTimeoutSession(0.25);
        should(newSession.sessionId).equal(d.sessionId);
        // @ts-expect-error
        should.exist(d.noCommandTimer);
        await endSession(newSession.sessionId);
        // @ts-expect-error
        should.not.exist(d.noCommandTimer);
      });
    });

    describe('settings api', function () {
      before(function () {
        d.settings = new DeviceSettings({ignoreUnimportantViews: false});
      });
      it('should be able to get settings object', function () {
        d.settings.getSettings().ignoreUnimportantViews.should.be.false;
      });
      it('should not reject when `updateSettings` method is not provided', async function () {
        await should(d.settings.update({ignoreUnimportantViews: true})).not.be.rejected();
      });
      it('should reject for invalid update object', async function () {
        await should(
          // @ts-expect-error
          d.settings.update('invalid json')
        ).be.rejectedWith('JSON');
      });
    });

    describe('unexpected exits', function () {
      /** @type {import('sinon').SinonSandbox} */
      let sandbox;
      beforeEach(function () {
        sandbox = sinon.createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('should reject a current command when the driver crashes', async function () {
        sandbox.stub(d, 'getStatus').callsFake(async function () {
          await B.delay(5000);
        });
        const reqPromise = getCommand('status', {validateStatus: null});
        // make sure that the request gets to the server before our shutdown
        await B.delay(100);
        const shutdownEventPromise = new B((resolve, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  'onUnexpectedShutdown event is expected to be fired within 5 seconds timeout'
                )
              ),
            5000
          );
          d.onUnexpectedShutdown(resolve);
        });
        d.startUnexpectedShutdown(new Error('Crashytimes'));
        const value = await reqPromise;
        value.message.should.contain('Crashytimes');
        await shutdownEventPromise;
      });
    });

    describe('event timings', function () {
      /** @type {NewSessionResponse} */
      let session;
      /** @type {SingularSessionData} */
      let res;

      describe('when not provided the eventTimings cap', function () {
        before(async function () {
          session = await startSession({capabilities: {alwaysMatch: defaultCaps}});
          res = await getSession(session.sessionId);
        });

        after(async function () {
          if (session) {
            await endSession(session.sessionId);
          }
        });

        it('should not respond with events', function () {
          expect(res.events).to.be.undefined;
        });
      });

      describe('when provided the eventTimings cap', function () {
        before(async function () {
          session = await startSession({
            capabilities: {alwaysMatch: {...defaultCaps, 'appium:eventTimings': true}},
          });
          res = await getSession(session.sessionId);
        });

        after(async function () {
          if (session) {
            await endSession(session.sessionId);
          }
        });

        it('should add a newSessionRequested event', function () {
          expect(res.events?.newSessionRequested?.[0]).to.be.a('number');
        });

        it('should add a newSessionStarted event', function () {
          expect(res.events?.newSessionRequested?.[0]).to.be.a('number');
        });
      });
    });
  });
}

/**
 * @typedef {import('@appium/types').DriverClass} DriverClass
 * @typedef {import('@appium/types').Driver} Driver
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').BaseDriverCapConstraints} BaseDriverCapConstraints
 * @typedef {import('@appium/types').BaseNSCapabilities} BaseNSCapabilities
 * @typedef {import('axios').RawAxiosRequestConfig} RawAxiosRequestConfig
 */

/**
 * `Constraints` is purposefully loose here
 * @template {Constraints} [C=Constraints]
 * @typedef {import('@appium/types').SingularSessionData<C>} SingularSessionData
 */

/**
 * @template T,D
 * @typedef {import('axios').AxiosResponse<T, D>} AxiosResponse
 */

/**
 * `Constraints` is purposefully loose here
 * @template {Constraints} [C=Constraints]
 * @typedef NewSessionData
 * @property {import('type-fest').RequireAtLeastOne<import('@appium/types').W3CCapabilities<C>, 'firstMatch'|'alwaysMatch'>} capabilities
 */

/**
 * `Constraints` is purposefully loose here
 * @template {Constraints} [C=Constraints]
 * @typedef NewSessionResponse
 * @property {string} sessionId,
 * @property {import('@appium/types').Capabilities<C>} capabilities
 */

/**
 * Some E2E helpers for making requests and managing sessions
 * See {@linkcode createSessionHelpers}
 * @template [CommandData=unknown]
 * @template [ResponseData=any]
 * @typedef SessionHelpers
 * @property {string} newSessionURL - URL to create a new session. Can be used with raw `axios` requests to fully inspect raw response.  Mostly, this will not be used.
 * @property {(data: NewSessionData, config?: RawAxiosRequestConfig) => Promise<NewSessionResponse>} startSession - Begin a session
 * @property {(sessionId: string) => Promise<AxiosResponse<{value: {error?: string}?}, {validateStatus: null}>>} endSession - End a session. _Note: resolves with raw response object_
 * @property {(sessionId: string) => Promise<SingularSessionData>} getSession - Get info about a session
 * @property {(sessionId: string, cmdName: string, data?: CommandData, config?: RawAxiosRequestConfig) => Promise<ResponseData>} postCommand - Send an arbitrary command via `POST`.
 * @property {(sessionIdOrCmdName: string, cmdNameOrConfig: string|RawAxiosRequestConfig, config?: RawAxiosRequestConfig) => Promise<ResponseData>} getCommand - Send an arbitrary command via `GET`. Optional `sessionId`.
 */
