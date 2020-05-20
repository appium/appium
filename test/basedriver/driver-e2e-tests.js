import _ from 'lodash';
import { server, routeConfiguringFunction, DeviceSettings, errors } from '../..';
import {
  MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY
} from '../../lib/constants';
import axios from 'axios';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';

const should = chai.should();
const DEFAULT_ARGS = {
  address: 'localhost',
  port: 8181
};
chai.use(chaiAsPromised);

function baseDriverE2ETests (DriverClass, defaultCaps = {}) {
  describe('BaseDriver (e2e)', function () {
    let baseServer, d = new DriverClass(DEFAULT_ARGS);
    before(async function () {
      baseServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(d),
        port: DEFAULT_ARGS.port,
      });
    });
    after(async function () {
      await baseServer.close();
    });

    async function startSession (caps) {
      return (await axios({
        url: 'http://localhost:8181/wd/hub/session',
        method: 'POST',
        data: {desiredCapabilities: caps, requiredCapabilities: {}},
      })).data;
    }

    async function endSession (id) {
      return (await axios({
        url: `http://localhost:8181/wd/hub/session/${id}`,
        method: 'DELETE',
        validateStatus: null,
      })).data;
    }

    async function getSession (id) {
      return (await axios({
        url: `http://localhost:8181/wd/hub/session/${id}`,
      })).data;
    }

    describe('session handling', function () {
      it('should handle idempotency while creating sessions', async function () {
        const sessionIds = [];
        let times = 0;
        do {
          const {sessionId} = (await axios({
            url: 'http://localhost:8181/wd/hub/session',
            headers: {
              'X-Idempotency-Key': '123456',
            },
            method: 'POST',
            data: {desiredCapabilities: defaultCaps, requiredCapabilities: {}},
            simple: false,
            resolveWithFullResponse: true
          })).data;

          sessionIds.push(sessionId);
          times++;
        } while (times < 2);
        _.uniq(sessionIds).length.should.equal(1);

        const {status, data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionIds[0]}`,
          method: 'DELETE',
        });
        status.should.equal(200);
        data.status.should.equal(0);
      });

      it('should handle idempotency while creating parallel sessions', async function () {
        const reqs = [];
        let times = 0;
        do {
          reqs.push(axios({
            url: 'http://localhost:8181/wd/hub/session',
            headers: {
              'X-Idempotency-Key': '12345',
            },
            method: 'POST',
            data: {desiredCapabilities: defaultCaps, requiredCapabilities: {}},
          }));
          times++;
        } while (times < 2);
        const sessionIds = (await B.all(reqs)).map((x) => x.data.sessionId);
        _.uniq(sessionIds).length.should.equal(1);

        const {status, data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionIds[0]}`,
          method: 'DELETE',
        });
        status.should.equal(200);
        data.status.should.equal(0);
      });

      it('should create session and retrieve a session id, then delete it', async function () {
        let {status, data} = await axios({
          url: 'http://localhost:8181/wd/hub/session',
          method: 'POST',
          data: {desiredCapabilities: defaultCaps, requiredCapabilities: {}},
        });

        status.should.equal(200);
        data.status.should.equal(0);
        should.exist(data.sessionId);
        data.value.should.eql(defaultCaps);

        ({status, data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
          method: 'DELETE',
        }));

        status.should.equal(200);
        data.status.should.equal(0);
        should.equal(d.sessionId, null);
      });
    });

    it.skip('should throw NYI for commands not implemented', async function () {
    });

    describe('command timeouts', function () {
      let originalFindElement, originalFindElements;
      async function startTimeoutSession (timeout) {
        let caps = _.clone(defaultCaps);
        caps.newCommandTimeout = timeout;
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

        await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}/element`,
          method: 'POST',
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        const {data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
          validateStatus: null,
        });
        data.status.should.equal(6);
        should.equal(d.sessionId, null);
        const {status} = await endSession(newSession.sessionId);
        status.should.equal(6);
      });

      it('should not timeout with commandTimeout of false', async function () {
        let newSession = await startTimeoutSession(0.1);
        let start = Date.now();
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}/elements`,
          method: 'POST',
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
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}/element`,
          method: 'POST',
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        let {status} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
        })).data;
        status.should.equal(0);
        ({status} = await endSession(newSession.sessionId));
        status.should.equal(0);

        d.newCommandTimeoutMs = 60 * 1000;
      });

      it('should not timeout if its just the command taking awhile', async function () {
        let newSession = await startTimeoutSession(0.25);
        await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}/element`,
          method: 'POST',
          data: {using: 'name', value: 'foo'},
        });
        await B.delay(400);
        let {status} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
          validateStatus: null,
        })).data;
        status.should.equal(6);
        should.equal(d.sessionId, null);
        ({status} = await endSession(newSession.sessionId));
        status.should.equal(6);
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
            url: 'http://localhost:8181/wd/hub/status',
            validateStatus: null,
          });
          // make sure that the request gets to the server before our shutdown
          await B.delay(100);
          const shutdownEventPromise = new B((resolve, reject) => {
            setTimeout(() => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')), 5000);
            d.onUnexpectedShutdown(resolve);
          });
          d.startUnexpectedShutdown(new Error('Crashytimes'));
          const {status, value} = (await reqPromise).data;
          status.should.equal(13);
          value.message.should.contain('Crashytimes');
          await shutdownEventPromise;
        } finally {
          d.getStatus = d._oldGetStatus;
        }
      });
    });

    describe('event timings', function () {
      it('should not add timings if not using opt-in cap', async function () {
        let session = await startSession(defaultCaps);
        let res = await getSession(session.sessionId);
        should.not.exist(res.events);
        await endSession(session.sessionId);
      });
      it('should add start session timings', async function () {
        let caps = Object.assign({}, defaultCaps, {eventTimings: true});
        let session = await startSession(caps);
        let res = (await getSession(session.sessionId)).value;
        should.exist(res.events);
        should.exist(res.events.newSessionRequested);
        should.exist(res.events.newSessionStarted);
        res.events.newSessionRequested[0].should.be.a('number');
        res.events.newSessionStarted[0].should.be.a('number');
        await endSession(session.sessionId);
      });
    });

    describe('execute driver script', function () {
      // mock some methods on BaseDriver that aren't normally there except in
      // a fully blown driver
      let originalFindElement, sessionId;
      before(function () {
        d.allowInsecure = ['execute_driver_script'];
        originalFindElement = d.findElement;
        d.findElement = (function (strategy, selector) {
          if (strategy === 'accessibility id' && selector === 'amazing') {
            return {[W3C_ELEMENT_KEY]: 'element-id-1'};
          }

          throw new errors.NoSuchElementError('not found');
        }).bind(d);
      });

      beforeEach(async function () {
        ({sessionId} = await startSession(defaultCaps));
      });

      after(function () {
        d.findElement = originalFindElement;
      });

      afterEach(async function () {
        await endSession(sessionId);
      });

      it('should not work unless the allowInsecure feature flag is set', async function () {
        d._allowInsecure = d.allowInsecure;
        try {
          d.allowInsecure = [];
          const script = `return 'foo'`;
          await axios({
            url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
            method: 'POST',
            data: {script, type: 'wd'},
          }).should.eventually.be.rejected;
          await endSession(sessionId);
        } finally {
          d.allowInsecure = d._allowInsecure;
        }
      });

      it('should execute a webdriverio script in the context of session', async function () {
        const script = `
          const timeouts = await driver.getTimeouts();
          const status = await driver.status();
          return [timeouts, status];
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script, type: 'webdriverio'},
        })).data;
        const expectedTimeouts = {command: 250, implicit: 0};
        const expectedStatus = {};
        value.result.should.eql([expectedTimeouts, expectedStatus]);
      });

      it('should fail with any script type other than webdriverio currently', async function () {
        const script = `return 'foo'`;
        await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script, type: 'wd'},
        }).should.eventually.be.rejected;
      });

      it('should execute a webdriverio script that returns elements correctly', async function () {
        const script = `
          return await driver.$("~amazing");
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script},
        })).data;
        value.result.should.eql({
          [W3C_ELEMENT_KEY]: 'element-id-1',
          [MJSONWP_ELEMENT_KEY]: 'element-id-1'
        });
      });

      it('should execute a webdriverio script that returns elements in deep structure', async function () {
        const script = `
          const el = await driver.$("~amazing");
          return {element: el, elements: [el, el]};
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script},
        })).data;
        const elObj = {
          [W3C_ELEMENT_KEY]: 'element-id-1',
          [MJSONWP_ELEMENT_KEY]: 'element-id-1'
        };
        value.result.should.eql({element: elObj, elements: [elObj, elObj]});
      });

      it('should store and return logs to the user', async function () {
        const script = `
          console.log("foo");
          console.log("foo2");
          console.warn("bar");
          console.error("baz");
          return null;
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script},
        })).data;
        value.logs.should.eql({log: ['foo', 'foo2'], warn: ['bar'], error: ['baz']});
      });

      it('should have appium specific commands available', async function () {
        const script = `
          return typeof driver.lock;
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          data: {script},
        })).data;
        value.result.should.eql('function');
      });

      it('should correctly handle errors that happen in a webdriverio script', async function () {
        const script = `
          return await driver.$("~notfound");
        `;
        const {data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          validateStatus: null,
          data: {script},
        });
        data.should.eql({
          sessionId,
          status: 13,
          value: {message: 'An unknown server-side error occurred while processing the command. Original error: Could not execute driver script. Original error was: Error: not found'}
        });
      });

      it('should correctly handle errors that happen when a script cannot be compiled', async function () {
        const script = `
          return {;
        `;
        const {data} = await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          validateStatus: null,
          data: {script},
        });
        sessionId.should.eql(data.sessionId);
        data.status.should.eql(13);
        data.value.should.have.property('message');
        data.value.message.should.match(/An unknown server-side error occurred while processing the command. Original error: Could not execute driver script. Original error was: Error: Unexpected token '?;'?/);
      });

      it('should be able to set a timeout on a driver script', async function () {
        const script = `
          await Promise.delay(1000);
          return true;
        `;
        const {value} = (await axios({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/appium/execute_driver`,
          method: 'POST',
          validateStatus: null,
          data: {script, timeout: 50},
        })).data;
        value.message.should.match(/.+50.+timeout.+/);
      });
    });
  });
}

export default baseDriverE2ETests;
