import _ from 'lodash';
import {server, routeConfiguringFunction, DeviceSettings} from 'appium/driver';
import axios, {type RawAxiosRequestConfig} from 'axios';
import B from 'bluebird';
import {TEST_HOST, getTestPort, createAppiumURL} from './helpers';
import sinon from 'sinon';
import {Agent} from 'node:http';
import type {BaseNSCapabilities, Driver, DriverClass, SingularSessionData} from '@appium/types';
import type {NewSessionResponse, SessionHelpers} from './types';

/**
 * Creates some helper functions for E2E tests to manage sessions.
 */
export function createSessionHelpers<CommandData = unknown, ResponseData = any>(
  port: number,
  address: string = TEST_HOST
): SessionHelpers<CommandData, ResponseData> {
  const createAppiumTestURL = createAppiumURL(address, port);
  const createSessionURL = (sessionId: string) => createAppiumTestURL(sessionId, '');
  const newSessionURL = createAppiumTestURL('', 'session');

  return {
    newSessionURL,
    createAppiumTestURL,
    postCommand: async (sessionId, cmdName, data = {} as CommandData, config = {}) => {
      const url = createAppiumTestURL(sessionId, cmdName);
      const response = await axios.post(url, data, config);
      return response.data?.value;
    },
    getCommand: async (sessionIdOrCmdName, cmdNameOrConfig, config = {}) => {
      if (!_.isString(cmdNameOrConfig)) {
        config = cmdNameOrConfig as RawAxiosRequestConfig;
        cmdNameOrConfig = sessionIdOrCmdName;
        sessionIdOrCmdName = '';
      }
      const response = await axios({
        url: createAppiumTestURL(sessionIdOrCmdName, cmdNameOrConfig as string),
        validateStatus: null,
        ...config,
      });
      return response.data?.value;
    },
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
    endSession: async (sessionId) =>
      await axios.delete(createSessionURL(sessionId), {
        validateStatus: null,
      }),
    getSession: async (sessionId) => {
      const response = await axios({
        url: createSessionURL(sessionId),
        validateStatus: null,
      });
      return response.data?.value;
    },
  };
}

/**
 * Creates E2E test suites for a driver.
 */
export function driverE2ETestSuite(
  DriverClass: DriverClass<Driver>,
  defaultCaps: Partial<BaseNSCapabilities> = {}
): void {
  const address = (defaultCaps as BaseNSCapabilities)['appium:address'] ?? TEST_HOST;
  let port: number | undefined = (defaultCaps as BaseNSCapabilities)['appium:port'];
  const className = DriverClass.name || '(unknown driver)';

  describe(`BaseDriver E2E (as ${className})`, function () {
    let baseServer: Awaited<ReturnType<typeof server>>;
    let d: InstanceType<typeof DriverClass>;
    let newSessionURL: string;
    let startSession: SessionHelpers['startSession'];
    let getSession: SessionHelpers['getSession'];
    let endSession: SessionHelpers['endSession'];
    let getCommand: SessionHelpers['getCommand'];
    let postCommand: SessionHelpers['postCommand'];
    let expect: Chai.ExpectStatic;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      (chai as any).use((chaiAsPromised as any).default);
      expect = (chai as any).expect;

      port = port ?? (await getTestPort());
      defaultCaps = {...defaultCaps};
      d = new DriverClass({port, address}) as InstanceType<typeof DriverClass>;
      baseServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(d),
        port: port!,
        hostname: address,
        cliArgs: {} as any,
      });
      const helpers = createSessionHelpers(port, address);
      startSession = helpers.startSession;
      getSession = helpers.getSession;
      endSession = helpers.endSession;
      getCommand = helpers.getCommand;
      postCommand = helpers.postCommand;
      newSessionURL = helpers.newSessionURL;
    });
    after(async function () {
      await baseServer?.close();
    });

    describe('session handling', function () {
      it('should handle idempotency while creating sessions', async function () {
        if (parseInt(process.versions.node.split('.')[0], 10) >= 24) {
          this.skip();
        }

        const httpAgent = new Agent({keepAlive: true});

        const sessionIds: string[] = [];
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
        expect(_.uniq(sessionIds)).to.have.lengthOf(1);

        const {status, data} = await endSession(sessionIds[0]);
        expect(status).to.equal(200);
        expect(data.value).to.be.null;
      });

      it('should handle idempotency while creating parallel sessions', async function () {
        if (parseInt(process.versions.node.split('.')[0], 10) >= 24) {
          this.skip();
        }

        const httpAgent = new Agent({keepAlive: true});

        const reqs: Promise<NewSessionResponse>[] = [];
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
        expect(_.uniq(sessionIds)).to.have.lengthOf(1);

        const {status, data} = await endSession(sessionIds[0]);
        expect(status).to.equal(200);
        expect(data.value).to.be.null;
      });

      it('should create session and retrieve a session id, then delete it', async function () {
        let {status, data} = await axios.post(newSessionURL, {
          capabilities: {
            alwaysMatch: defaultCaps,
          },
        });

        expect(status).to.equal(200);
        expect(data.value.sessionId).to.exist;
        expect(data.value.capabilities.platformName).to.equal(defaultCaps.platformName);
        expect(data.value.capabilities.deviceName).to.equal(
          (defaultCaps as BaseNSCapabilities)['appium:deviceName']
        );

        ({status, data} = await endSession(d.sessionId!));

        expect(status).to.equal(200);
        expect(data.value).to.be.null;
        expect(d.sessionId).to.be.null;
      });
    });

    describe('command timeouts', function () {
      let originalFindElement: typeof d.findElement;
      let originalFindElements: typeof d.findElements;

      async function startTimeoutSession(timeout?: number) {
        const caps = _.cloneDeep(defaultCaps);
        (caps as any)['appium:newCommandTimeout'] = timeout;
        return await startSession({capabilities: {alwaysMatch: caps}});
      }

      before(function () {
        originalFindElement = d.findElement;
        d.findElement = function () {
          return 'foo' as any;
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
        const newSession = await startTimeoutSession();
        expect(d.newCommandTimeoutMs).to.be.above(0);
        await endSession(newSession.sessionId);
      });

      it('should timeout on commands using commandTimeout cap', async function () {
        const newSession = await startTimeoutSession(0.25);
        const sessionId = d.sessionId!;
        await postCommand(sessionId, 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(sessionId);
        expect(value.error).to.equal('invalid session id');
        expect(d.sessionId).to.be.null;
        const resp = (await endSession(newSession.sessionId)).data.value;
        expect(resp?.error).to.equal('invalid session id');
      });

      it('should not timeout with commandTimeout of false', async function () {
        const newSession = await startTimeoutSession(0.1);
        const start = Date.now();
        const value = await postCommand(d.sessionId!, 'elements', {
          using: 'name',
          value: 'foo',
        });
        expect(Date.now() - start).to.be.above(150);
        expect(value).to.eql(['foo']);
        await endSession(newSession.sessionId);
      });

      it('should not timeout with commandTimeout of 0', async function () {
        d.newCommandTimeoutMs = 2;
        const newSession = await startTimeoutSession(0);

        await postCommand(d.sessionId!, 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(d.sessionId!);
        expect(value.platformName).to.equal(defaultCaps.platformName);
        const resp = (await endSession(newSession.sessionId)).data.value;
        expect(resp).to.be.null;

        d.newCommandTimeoutMs = 60 * 1000;
      });

      it('should not timeout if its just the command taking awhile', async function () {
        const newSession = await startTimeoutSession(0.25);
        const {sessionId} = d;

        await postCommand(d.sessionId!, 'element', {
          using: 'name',
          value: 'foo',
        });
        await B.delay(400);
        const value = await getSession(sessionId!);
        expect((value as any).error).to.equal('invalid session id');
        expect(d.sessionId).to.be.null;
        const resp = (await endSession(newSession.sessionId)).data.value as {error?: string};
        expect(resp?.error).to.equal('invalid session id');
      });

      it('should not have a timer running before or after a session', async function () {
        expect((d as any).noCommandTimer).to.be.null;
        const newSession = await startTimeoutSession(0.25);
        expect(newSession.sessionId).to.equal(d.sessionId);
        expect((d as any).noCommandTimer).to.exist;
        await endSession(newSession.sessionId);
        expect((d as any).noCommandTimer).to.be.null;
      });
    });

    describe('settings api', function () {
      before(function () {
        d.settings = new DeviceSettings({ignoreUnimportantViews: false});
      });
      it('should be able to get settings object', function () {
        expect(d.settings.getSettings().ignoreUnimportantViews).to.be.false;
      });
      it('should not reject when `updateSettings` method is not provided', async function () {
        await expect(d.settings.update({ignoreUnimportantViews: true})).to.not.be.rejected;
      });
      it('should reject for invalid update object', async function () {
        await expect(
          (d.settings as any).update('invalid json')
        ).to.be.rejectedWith('JSON');
      });
    });

    describe('unexpected exits', function () {
      let sandbox: ReturnType<typeof sinon.createSandbox>;
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
        await B.delay(100);
        const shutdownEventPromise = new B<void>((resolve, reject) => {
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
        expect((value as any).message).to.contain('Crashytimes');
        await shutdownEventPromise;
      });
    });

    describe('event timings', function () {
      let session: NewSessionResponse | undefined;
      let res: SingularSessionData;

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
