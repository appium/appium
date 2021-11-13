import _ from 'lodash';
import { BaseDriver, server, routeConfiguringFunction, DeviceSettings } from '../../lib';
import axios from 'axios';
import B from 'bluebird';
import {TEST_HOST, getTestPort, createAppiumURL, METHODS} from '../helpers';
import { PREFIXED_APPIUM_OPTS_CAP } from '../../lib/basedriver/capabilities';
const {POST, DELETE} = METHODS;

function baseDriverE2ETests (DriverClass, defaultCaps = {}) {
  let address = defaultCaps['appium:address'] ?? TEST_HOST;
  let port = defaultCaps['appium:port'];
  const className = DriverClass.name || '(unknown driver)';

  describe(`BaseDriver E2E (as ${className})`, function () {
    let baseServer, d;
    /**
       * This URL creates a new session
       * @type {string}
       **/
    let newSessionURL;

    /**
     * Creates a URL with base host/port. Supply `session` and `pathname`
     * @type {_.CurriedFunction2<string,string,string>}
     */
    let createAppiumTestURL;

    /**
     * Creates a URL with the given session ID and a blank pathname;
     * e.g., `http://foo.bar:123/session/<session-id>`
     *  @type {_.CurriedFunction1<string,string>}
     */
    let createSessionURL;

    before(async function () {
      port = port ?? await getTestPort();
      defaultCaps = {...defaultCaps, 'appium:port': port};
      d = new DriverClass({port, address});
      baseServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(d),
        port,
        hostname: TEST_HOST
      });
      createAppiumTestURL = createAppiumURL(address, port);
      newSessionURL = createAppiumTestURL('', 'session');
      createSessionURL = createAppiumTestURL(_, '');
    });

    after(async function () {
      await baseServer.close();
    });

    async function startSession (caps) {
      return (await axios({
        url: newSessionURL,
        method: POST,
        data: {capabilities: {alwaysMatch: caps, firstMatch: [{}]}},
      })).data.value;
    }

    async function endSession (id) {
      return (await axios({
        url: createSessionURL(id),
        method: DELETE,
        validateStatus: null,
      })).data.value;
    }

    async function getSession (id) {
      return (await axios({
        url: createSessionURL(id),
      })).data.value;
    }

    describe('session handling', function () {
      it('should handle idempotency while creating sessions', async function () {
        const sessionIds = [];
        let times = 0;
        do {
          const {sessionId} = (await axios({
            url: newSessionURL,
            headers: {
              'X-Idempotency-Key': '123456',
            },
            method: POST,
            data: {capabilities: {alwaysMatch: defaultCaps, firstMatch: [{}]}},
            simple: false,
            resolveWithFullResponse: true
          })).data.value;

          sessionIds.push(sessionId);
          times++;
        } while (times < 2);
        _.uniq(sessionIds).length.should.equal(1);

        const {status, data} = await axios({
          url: createSessionURL(sessionIds[0]),
          method: DELETE,
        });
        status.should.equal(200);
        should.equal(data.value, null);
      });

      it('should handle idempotency while creating parallel sessions', async function () {
        const reqs = [];
        let times = 0;
        do {
          reqs.push(axios({
            url: newSessionURL,
            headers: {
              'X-Idempotency-Key': '12345',
            },
            method: POST,
            data: {capabilities: {alwaysMatch: defaultCaps, firstMatch: [{}]}},
          }));
          times++;
        } while (times < 2);
        const sessionIds = (await B.all(reqs)).map((x) => x.data.value.sessionId);
        _.uniq(sessionIds).length.should.equal(1);

        const {status, data} = await axios({
          url: createSessionURL(sessionIds[0]),
          method: DELETE,
        });
        status.should.equal(200);
        should.equal(data.value, null);
      });

      it('should create session and retrieve a session id, then delete it', async function () {
        let {status, data} = await axios({
          url: newSessionURL,
          method: POST,
          data: {capabilities: {alwaysMatch: defaultCaps, firstMatch: [{}]}},
        });

        status.should.equal(200);
        should.exist(data.value.sessionId);
        data.value.capabilities.platformName.should.equal(defaultCaps.platformName);
        data.value.capabilities.deviceName.should.equal(defaultCaps['appium:deviceName']);

        ({status, data} = await axios({
          url: createSessionURL(d.sessionId),
          method: DELETE,
        }));

        status.should.equal(200);
        should.equal(data.value, null);
        should.equal(d.sessionId, null);
      });
    });

    it.skip('should throw NYI for commands not implemented', async function () {
    });

    describe('command timeouts', function () {
      let originalFindElement, originalFindElements;

      async function startTimeoutSession (timeout) {
        const caps = _.cloneDeep(defaultCaps);
        caps['appium:newCommandTimeout'] = timeout;
        return await startSession(caps);
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
        d.newCommandTimeoutMs.should.be.above(0);
        await endSession(newSession.sessionId);
      });

      it('should timeout on commands using commandTimeout cap', async function () {
        let newSession = await startTimeoutSession(0.25);
        // XXX: race condition: we must build this URL before ...something happens...
        // which causes `d.sessionId` to be missing
        let sessionURL = createSessionURL(d.sessionId);
        await axios({
          url: createAppiumTestURL(d.sessionId, 'element'),
          method: POST,
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        const {data} = await axios({
          url: sessionURL,
          validateStatus: null,
        });
        should.equal(data.value.error, 'invalid session id');
        should.equal(d.sessionId, null);
        const resp = await endSession(newSession.sessionId);
        should.equal(resp.error, 'invalid session id');
      });

      it('should not timeout with commandTimeout of false', async function () {
        let newSession = await startTimeoutSession(0.1);
        let start = Date.now();
        const {value} = (await axios({
          url: createAppiumTestURL(d.sessionId, 'elements'),
          method: POST,
          data: {using: 'name', value: 'foo'},
        })).data;
        (Date.now() - start).should.be.above(150);
        value.should.eql(['foo']);
        await endSession(newSession.sessionId);
      });

      it('should not timeout with commandTimeout of 0', async function () {
        d.newCommandTimeoutMs = 2;
        let newSession = await startTimeoutSession(0);

        await axios({
          url: createAppiumTestURL(d.sessionId, 'element'),
          method: POST,
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        const {value} = (await axios({
          url: createSessionURL(d.sessionId),
        })).data;
        value.platformName.should.equal(defaultCaps.platformName);
        const resp = await endSession(newSession.sessionId);
        should.equal(resp, null);

        d.newCommandTimeoutMs = 60 * 1000;
      });

      it('should not timeout if its just the command taking awhile', async function () {
        let newSession = await startTimeoutSession(0.25);
        // XXX: race condition: we must build this URL before ...something happens...
        // which causes `d.sessionId` to be missing
        let sessionURL = createSessionURL(d.sessionId);
        await axios({
          url: createAppiumTestURL(d.sessionId, 'element'),
          method: POST,
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        const {value} = (await axios({
          url: sessionURL,
          validateStatus: null,
        })).data;
        value.error.should.equal('invalid session id');
        should.equal(d.sessionId, null);
        const resp = await endSession(newSession.sessionId);
        resp.error.should.equal('invalid session id');
      });

      it('should not have a timer running before or after a session', async function () {
        should.not.exist(d.noCommandTimer);
        let newSession = await startTimeoutSession(0.25);
        newSession.sessionId.should.equal(d.sessionId);
        should.exist(d.noCommandTimer);
        await endSession(newSession.sessionId);
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
      it('should throw error when updateSettings method is not defined', async function () {
        await d.settings.update({ignoreUnimportantViews: true}).should.eventually
                .be.rejectedWith('onSettingsUpdate');
      });
      it('should throw error for invalid update object', async function () {
        await d.settings.update('invalid json').should.eventually
                .be.rejectedWith('JSON');
      });
    });

    describe('unexpected exits', function () {
      it('should reject a current command when the driver crashes', async function () {
        d._oldGetStatus = d.getStatus;
        try {
          d.getStatus = async function () {
            await B.delay(5000);
          }.bind(d);
          const reqPromise = axios({
            url: createAppiumTestURL('', 'status'),
            validateStatus: null,
          });
          // make sure that the request gets to the server before our shutdown
          await B.delay(100);
          const shutdownEventPromise = new B((resolve, reject) => {
            setTimeout(() => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')), 5000);
            d.onUnexpectedShutdown(resolve);
          });
          d.startUnexpectedShutdown(new Error('Crashytimes'));
          const {value} = (await reqPromise).data;
          value.message.should.contain('Crashytimes');
          await shutdownEventPromise;
        } finally {
          d.getStatus = d._oldGetStatus;
        }
      });
    });

    describe('event timings', function () {
      it('should not add timings if not using opt-in cap', async function () {
        const session = await startSession(defaultCaps);
        const res = await getSession(session.sessionId);
        should.not.exist(res.events);
        await endSession(session.sessionId);
      });
      it('should add start session timings', async function () {
        const caps = Object.assign({}, defaultCaps, {'appium:eventTimings': true});
        const session = await startSession(caps);
        const res = (await getSession(session.sessionId));
        should.exist(res.events);
        should.exist(res.events.newSessionRequested);
        should.exist(res.events.newSessionStarted);
        res.events.newSessionRequested[0].should.be.a('number');
        res.events.newSessionStarted[0].should.be.a('number');
        await endSession(session.sessionId);
      });
    });

    if (DriverClass === BaseDriver) {
      // only run this test on basedriver, not other drivers which also use these tests, since we
      // don't want them to try and start sessions with these random capabilities that are
      // necessary to test the appium options logic
      describe('special appium:options capability', function () {
        it('should be able to start a session with caps held in appium:options', async function () {
          const ret = await startSession({
            platformName: 'iOS',
            [PREFIXED_APPIUM_OPTS_CAP]: {
              platformVersion: '11.4',
              'appium:deviceName': 'iPhone 11',
            }
          });
          d.opts.platformVersion.should.eql('11.4');
          d.opts.deviceName.should.eql('iPhone 11');
          await endSession(ret.sessionId);
        });
      });
    }
  });
}

export default baseDriverE2ETests;
