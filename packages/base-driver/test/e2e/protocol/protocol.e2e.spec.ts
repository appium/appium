import { getTestPort, TEST_HOST } from '@appium/driver-test-support';
import type { RouteMatcher } from '@appium/types';
import axios from 'axios';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { Application, Request, Response } from 'express';
import { StatusCodes as HTTPStatusCodes } from 'http-status-codes';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { createSandbox } from 'sinon';
import { errors, JWProxy } from '../../../lib';
import { MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY } from '../../../lib/constants';
import { createServer } from '../../helpers';
import { FakeDriver } from './fake-driver';
import { createProxyServer } from './helpers';

chai.use(chaiAsPromised);

describe('Protocol', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('direct to driver', function () {
    const d = new FakeDriver();
    it('should return response values directly from the driver', async function () {
      expect(await d.setUrl('http://google.com')).to.contain('google');
    });
  });

  describe('via express router', function () {
    let driver: FakeDriver;
    let baseUrl: string;
    let teardown: () => Promise<void> | undefined;

    before(async function () {
      driver = new FakeDriver();
      driver.sessionId = 'foo';
      const { baseUrl: baseUrlStr, setup, teardown: teardownFn } = await createServer(driver);
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    after(async function () {
      await teardown?.();
    });

    it('should proxy to driver and return valid jsonwp response', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
      });
    });

    it('should assume requests without a Content-Type are json requests', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
      });
    });

    it('should respond to x-www-form-urlencoded as well as json requests', async function () {
      const reqData = new URLSearchParams();
      reqData.set('url', 'http://google.com');
      const { data } = await axios({
        url: `${baseUrl}/session/foo/url`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        data: reqData.toString(),
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
      });
    });

    it('should include url request parameters for methods to use - sessionid', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session/foo/back`,
        method: 'POST',
        data: {},
      });
      expect(data).to.eql({
        value: 'foo',
      });
    });

    it('should include url request parameters for methods to use - elementid', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session/foo/element/bar/click`,
        method: 'POST',
        data: {},
      });
      expect(data.value).to.eql(['bar', 'foo']);
    });

    it('should include url req params in the order: custom, element, session', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session/foo/element/bar/attribute/baz`,
      });
      expect(data.value).to.eql(['baz', 'bar', 'foo']);
    });

    it('should respond with 400 Bad Request if parameters missing', async function () {
      const { data, status } = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {},
        validateStatus: null,
      });
      expect(status).to.equal(400);
      expect(JSON.stringify(data)).to.contain('url');
    });

    it('should reject requests with a badly formatted body and not crash', async function () {
      await expect(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: 'oh hello',
        }),
      ).to.be.rejectedWith(Error);

      const { data } = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
      });
    });

    it('should get 404 for bad routes', async function () {
      await expect(
        axios({
          url: `${baseUrl}/blargimarg`,
        }),
      ).to.be.rejectedWith(/404/);
    });

    it('4xx responses should have content-type of application/json', async function () {
      const { headers } = await axios({
        url: `${baseUrl}/blargimargarita`,
        validateStatus: null,
      });

      expect(headers['content-type']).to.include('application/json');
    });

    it('should return unknown command for routes without a command mapping', async function () {
      const { status, data } = await axios({
        url: `${baseUrl}/session/foo/element/bar/location`,
        validateStatus: null,
      });

      expect(status).to.equal(404);
      expect(data.value.error).to.eql('unknown command');
      expect(data.value.message).to.match(/The requested resource could not be found/);
    });

    it('should return unknown command for ignored legacy routes', async function () {
      const { status, data } = await axios({
        url: `${baseUrl}/session/foo/buttonup`,
        method: 'POST',
        validateStatus: null,
        data: {},
      });

      expect(status).to.equal(404);
      expect(data.value.error).to.eql('unknown command');
      expect(data.value.message).to.match(/The requested resource could not be found/);
    });

    it('should get 400 for bad parameters', async function () {
      await expect(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: {},
        }),
      ).to.be.rejectedWith(/400/);
    });

    it('should ignore special extra payload params in the right contexts', async function () {
      await axios({
        url: `${baseUrl}/session/foo/element/bar/value`,
        method: 'POST',
        data: { id: 'baz', sessionId: 'lol', value: ['a'], text: 'bar' },
      });

      await expect(
        axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: { id: 'baz' },
        }),
      ).to.be.rejectedWith(/400/);

      // make sure adding the optional 'id' doesn't clobber a route where we
      // have an actual required 'id'
      await axios({
        url: `${baseUrl}/session/foo/frame`,
        method: 'POST',
        data: { id: 'baz' },
      });
    });

    it('should return the correct error even if driver does not throw', async function () {
      const { status, data } = await axios({
        url: `${baseUrl}/session/foo/appium/settings`,
        method: 'GET',
        validateStatus: null,
      });
      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql('Mishandled Driver Error');
      expect(data.sessionId).to.not.exist;
    });

    describe('w3c sendkeys migration', function () {
      it('should not accept value for sendkeys', async function () {
        await expect(
          axios({
            url: `${baseUrl}/session/foo/element/bar/value`,
            method: 'POST',
            data: { value: 'text to type' },
          }),
        ).to.be.rejectedWith(/400/);
      });
      it('should accept text for sendkeys', async function () {
        const { data } = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: { text: 'text to type' },
        });
        expect(data.value).to.eql(['text to type', 'bar']);
      });
      it('should accept value and text for sendkeys, and use text', async function () {
        const { data } = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: { value: 'text to ignore', text: 'text to type' },
        });
        expect(data.value).to.eql(['text to type', 'bar']);
      });
    });

    describe('create sessions via HTTP endpoint', function () {
      let sessionId: string | null;

      beforeEach(function () {
        sessionId = null;
      });
      afterEach(async function () {
        if (sessionId) {
          await axios.delete(`${baseUrl}/session/${sessionId}`);
        }
      });

      it('should not allow create session with desired caps (MJSONWP)', async function () {
        const desiredCapabilities = { a: 'b' };
        await expect(
          axios({
            url: `${baseUrl}/session`,
            method: 'POST',
            data: { desiredCapabilities },
          }),
        ).to.be.rejectedWith(/500/);
      });
      it('should allow create session with capabilities (W3C)', async function () {
        const w3cCapabilities = { alwaysMatch: { 'appium:e': 'f' } };
        const { data } = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: { capabilities: w3cCapabilities },
        });
        expect(data.status).to.not.exist;
        expect(data.sessionId).to.not.exist;
        expect(data.value.capabilities).to.eql(w3cCapabilities);
        expect(data.value.sessionId).to.exist;
        sessionId = data.value.sessionId;
      });

      describe('w3c endpoints', function () {
        let sessionUrl: string;

        beforeEach(async function () {
          // Start a W3C session
          const { value } = (
            await axios({
              url: `${baseUrl}/session`,
              method: 'POST',
              data: {
                capabilities: {
                  alwaysMatch: {
                    platformName: 'Fake',
                    'appium:deviceName': 'Commodore 64',
                  },
                  firstMatch: [{}],
                },
              },
            })
          ).data;
          sessionId = value.sessionId;
          sessionUrl = `${baseUrl}/session/${sessionId}`;
        });

        it('should throw 400 Bad Parameters exception if the parameters are bad', async function () {
          const { status, data } = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              bad: 'params',
            },
          });
          expect(status).to.equal(400);

          const { error: w3cError, message, stacktrace } = data.value;
          expect(message).to.match(/following required parameter/);
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.InvalidArgumentError.error());
        });

        it(`should throw 405 exception if the command hasn't been implemented yet`, async function () {
          const { status, data } = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          expect(status).to.equal(405);

          const { error: w3cError, message, stacktrace } = data.value;
          expect(message).to.match(/Method has not yet been implemented/);
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.NotYetImplementedError.error());
          expect(message).to.match(/Method has not yet been implemented/);
        });

        it(`should throw 500 Unknown Error if the command throws an unexpected exception`, async function () {
          (driver as any).performActions = () => {
            throw new Error(`Didn't work`);
          };
          const { status, data } = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          expect(status).to.equal(500);

          const { error: w3cError, message, stacktrace } = data.value;
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.UnknownError.error());
          expect(message).to.match(/Didn't work/);

          delete (driver as any).performActions;
        });

        it(`should translate element format from MJSONWP to W3C`, async function () {
          const retValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                other: 'bar',
              },
            },
            {
              [MJSONWP_ELEMENT_KEY]: 'bar',
            },
            'ignore',
          ];

          const expectedValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                [W3C_ELEMENT_KEY]: 'fooo',
                other: 'bar',
              },
            },
            {
              [MJSONWP_ELEMENT_KEY]: 'bar',
              [W3C_ELEMENT_KEY]: 'bar',
            },
            'ignore',
          ];

          const findElementsBackup = driver.findElements;
          driver.findElements = () => Promise.resolve(retValue as any);
          const { data } = await axios.post(`${sessionUrl}/elements`, {
            using: 'whatever',
            value: 'whatever',
          });
          expect(data.value).to.eql(expectedValue);
          driver.findElements = findElementsBackup;
        });

        it(`should fail with a 408 error if it throws a TimeoutError exception`, async function () {
          const setUrlStub = sandbox.stub(driver, 'setUrl').callsFake(function () {
            throw new errors.TimeoutError();
          });
          const { status, data } = await axios({
            url: `${sessionUrl}/url`,
            method: 'POST',
            validateStatus: null,
            data: {
              url: 'https://example.com/',
            },
          });
          expect(status).to.equal(408);

          const { error: w3cError, message, stacktrace } = data.value;
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.TimeoutError.error());
          expect(message).to.match(/An operation did not complete before its timeout expired/);

          setUrlStub.restore();
        });

        it(`should pass with 200 HTTP status code if the command returns a value`, async function () {
          (driver as any).performActions = (actions: object[]) => 'It works ' + actions.join('');
          const { status, value, sessionId } = (
            await axios.post(`${sessionUrl}/actions`, {
              actions: ['a', 'b', 'c'],
            })
          ).data;
          expect(sessionId).to.not.exist;
          expect(status).to.not.exist;
          expect(value).to.equal('It works abc');
          delete (driver as any).performActions;
        });

        describe('jwproxy', function () {
          let port: number;
          let server: ReturnType<Application['listen']>;
          let jwproxy: JWProxy;
          let app: Application;

          before(async function () {
            port = await getTestPort();
          });

          beforeEach(function () {
            const res = createProxyServer(port);
            server = res.server;
            app = res.app;
            jwproxy = new JWProxy({ server: TEST_HOST, port });
            jwproxy.sessionId = sessionId;
            (driver as any).performActions = async (actions: object[]) =>
              await jwproxy.command('/perform-actions', 'POST', actions);
          });

          afterEach(async function () {
            delete (driver as any).performActions;
            await server.close();
          });

          it('should work if a proxied request returns a response with status 200', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.json({
                sessionId: req.params.sessionId,
                value: req.body,
                status: 0,
              });
            });

            const { status, value, sessionId } = (
              await axios.post(`${sessionUrl}/actions`, {
                actions: [1, 2, 3],
              })
            ).data;
            expect(value).to.eql([1, 2, 3]);
            expect(status).to.not.exist;
            expect(sessionId).to.not.exist;
          });

          it('should return error if a proxied request returns a MJSONWP error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(500).json({
                sessionId,
                status: 6,
                value: 'A problem occurred',
              });
            });
            const { status, data } = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            expect(JSON.stringify(data)).to.match(/A problem occurred/);
          });

          it('should return W3C error if a proxied request returns a W3C error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(500).json({
                value: {
                  error: 'unknown error',
                  message: 'Some error occurred',
                  stacktrace: 'Some error occurred',
                },
              });
            });
            const { status, data } = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: { actions: [1, 2, 3] },
            });
            expect(status).to.equal(500);
            const { error: w3cError, message: errMessage, stacktrace } = data.value;
            expect(w3cError).to.equal('unknown error');
            expect(stacktrace).to.match(/Some error occurred/);
            expect(errMessage).to.equal('Some error occurred');
          });

          it('should return error if a proxied request returns a MJSONWP error response but HTTP status code is 200', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(200).json({
                sessionId: 'Fake Session Id',
                status: 7,
                value: 'A problem occurred',
              });
            });
            const { status, data } = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            const { error: w3cError, message: errMessage, stacktrace } = data.value;
            expect(w3cError).to.equal('no such element');
            expect(errMessage).to.match(/A problem occurred/);
            expect(stacktrace).to.exist;
          });

          it('should return error if a proxied request returns a W3C error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(404).json({
                value: {
                  error: 'no such element',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const { status, data } = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            const { error: w3cError, stacktrace } = data.value;
            expect(w3cError).to.equal('no such element');
            expect(stacktrace).to.match(/arbitrary stacktrace/);
          });

          it('should return an error if a proxied request returns a W3C error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.set('Connection', 'close');
              res.status(444).json({
                value: {
                  error: 'bogus error code',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const { status, data } = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.INTERNAL_SERVER_ERROR);
            const { error: w3cError, stacktrace } = data.value;
            expect(w3cError).to.equal('unknown error');
            expect(stacktrace).to.match(/arbitrary stacktrace/);
          });
        });
      });
    });

    it('should send 404 response for invalid session id', async function () {
      const { status, data } = await axios({
        url: `${baseUrl}/session/foo/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      expect(status).to.equal(404);
      expect(data.value.error).to.eql('invalid session id');
      expect(data.value.message).to.eql('A session is either terminated or not started');
    });
  });

  describe('session Ids', function () {
    let driver: FakeDriver;
    let baseUrl: string;
    let teardown: () => Promise<void> | undefined;

    before(async function () {
      driver = new FakeDriver();
      const { baseUrl: baseUrlStr, setup, teardown: teardownFn } = await createServer(driver);
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    after(async function () {
      await teardown?.();
    });

    afterEach(function () {
      driver.sessionId = null;
    });

    it('responds with no session ID in the request', async function () {
      const sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      const { data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
        validateStatus: null,
      });

      expect(data.sessionId).to.not.exist;
    });

    it('should return a new session ID on create', async function () {
      const { data } = await axios({
        url: `${baseUrl}/session`,
        method: 'POST',
        data: {
          capabilities: {
            alwaysMatch: { 'appium:greeting': 'hello' },
            firstMatch: [{}],
          },
        },
      });

      try {
        expect(data.value.sessionId).to.exist;
        expect(data.value.sessionId.indexOf('fakeSession_')).to.equal(0);
        expect(data.value.capabilities).to.eql({
          alwaysMatch: { 'appium:greeting': 'hello' },
          firstMatch: [{}],
        });
      } finally {
        if (data.value.sessionId) {
          await axios.delete(`${baseUrl}/session/${data.value.sessionId}`);
        }
      }
    });
  });

  describe('via drivers jsonwp proxy', function () {
    let driver: FakeDriver;
    const sessionId = 'foo';
    let baseUrl: string;
    let teardown: () => Promise<void> | undefined;

    beforeEach(async function () {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      driver.proxyActive = () => true;
      driver.canProxy = () => true;
      const {
        baseUrl: baseUrlStr,
        setup,
        teardown: teardownFn,
      } = await createServer(driver, { extraMethodMap: FakeDriver.newMethodMap });
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    afterEach(async function () {
      await teardown?.();
    });

    it('should give a nice error if proxying is set but no proxy function exists', async function () {
      (driver as any).canProxy = () => false;
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: { url: 'http://google.com' },
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql('Trying to proxy to a server but the driver is unable to proxy');
    });

    it('should pass on any errors in proxying', async function () {
      (driver as any).proxyReqRes = async function () {
        throw new Error('foo');
      };
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: { url: 'http://google.com' },
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.match(/Proxy error: foo/);
    });

    it('should able to throw ProxyRequestError in proxying', async function () {
      (driver as any).proxyReqRes = async function () {
        const jsonwp = {
          status: 35,
          value: 'No such context found.',
          sessionId: 'foo',
        };
        throw new errors.ProxyRequestError(`Could not proxy command to remote server. `, jsonwp);
      };
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: { url: 'http://google.com' },
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql('No such context found.');
    });

    it('should let the proxy handle req/res', async function () {
      (driver as any).proxyReqRes = async function (req: Request, res: Response) {
        res.status(200).json({ custom: 'data' });
      };
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
      });

      expect(status).to.equal(200);
      expect(data).to.eql({ custom: 'data' });
    });

    it('should avoid jsonwp proxying when path matches avoidance list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('^/session/[^/]+/url$')]];
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: { url: 'http://google.com' },
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
      });
    });

    it('should fail if avoid proxy list is malformed in some way', async function () {
      async function badProxyAvoidanceList(list: RouteMatcher[]) {
        driver.getProxyAvoidList = () => list;
        const { status, data } = await axios({
          url: `${baseUrl}/session/${sessionId}/url`,
          method: 'POST',
          validateStatus: null,
          data: { url: 'http://google.com' },
        });

        expect(status).to.equal(500);
        expect(data.value.message).to.contain('roxy');
      }
      const lists = ['foo', [['foo']], [['BAR', /lol/]], [['GET', 'foo']]];
      for (const list of lists) {
        await badProxyAvoidanceList(list as RouteMatcher[]);
      }
    });

    it('should avoid proxying non-session commands even if not in the list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      const { status, data } = await axios({
        url: `${baseUrl}/status`,
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: "I'm fine",
      });
    });

    it('should avoid proxying deleteSession commands', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      expect(driver.sessionId).to.equal(sessionId);
      const { status } = await axios.delete(`${baseUrl}/session/${sessionId}`);

      expect(status).to.equal(200);
      expect(driver.sessionId).to.not.exist;
      expect(driver.jwpProxyActive).to.be.false;
    });

    it('should avoid proxying when command spec specifies neverProxy', async function () {
      const { status, data } = await axios({
        url: `${baseUrl}/session/${sessionId}/noproxy`,
        method: 'GET',
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: 'This was not proxied',
      });
    });
  });
});
