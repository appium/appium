import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import type {RouteMatcher} from '@appium/types';
import axios from 'axios';
import type {Application, Request, Response} from 'express';
import {StatusCodes as HTTPStatusCodes} from 'http-status-codes';
import {createSandbox} from 'sinon';

import {errors, JWProxy} from '../../../lib';
import {MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY} from '../../../lib/constants';
import {createServer} from '../../helpers';
import {FakeDriver} from './fake-driver';
import {createProxyServer} from './helpers';

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
      assert.ok((await d.setUrl('http://google.com')).includes('google'));
    });
  });

  describe('via express router', function () {
    let driver: FakeDriver;
    let baseUrl: string;
    let teardown: () => Promise<void> | undefined;

    before(async function () {
      driver = new FakeDriver();
      driver.sessionId = 'foo';
      const {baseUrl: baseUrlStr, setup, teardown: teardownFn} = await createServer(driver);
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    after(async function () {
      await teardown?.();
    });

    it('should proxy to driver and return valid jsonwp response', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      assert.deepStrictEqual(data, {
        value: 'Navigated to: http://google.com',
      });
    });

    it('should assume requests without a Content-Type are json requests', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      assert.deepStrictEqual(data, {
        value: 'Navigated to: http://google.com',
      });
    });

    it('should respond to x-www-form-urlencoded as well as json requests', async function () {
      const reqData = new URLSearchParams();
      reqData.set('url', 'http://google.com');
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        data: reqData.toString(),
      });
      assert.deepStrictEqual(data, {
        value: 'Navigated to: http://google.com',
      });
    });

    it('should include url request parameters for methods to use - sessionid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/back`,
        method: 'POST',
        data: {},
      });
      assert.deepStrictEqual(data, {
        value: 'foo',
      });
    });

    it('should include url request parameters for methods to use - elementid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/click`,
        method: 'POST',
        data: {},
      });
      assert.deepStrictEqual(data.value, ['bar', 'foo']);
    });

    it('should include url req params in the order: custom, element, session', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/attribute/baz`,
      });
      assert.deepStrictEqual(data.value, ['baz', 'bar', 'foo']);
    });

    it('should respond with 400 Bad Request if parameters missing', async function () {
      const {data, status} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {},
        validateStatus: null,
      });
      assert.strictEqual(status, 400);
      assert.ok(JSON.stringify(data).includes('url'));
    });

    it('should reject requests with a badly formatted body and not crash', async function () {
      await assert.rejects(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: 'oh hello',
        }),
        Error,
      );

      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      assert.deepStrictEqual(data, {
        value: 'Navigated to: http://google.com',
      });
    });

    it('should get 404 for bad routes', async function () {
      await assert.rejects(
        axios({
          url: `${baseUrl}/blargimarg`,
        }),
        /404/,
      );
    });

    it('4xx responses should have content-type of application/json', async function () {
      const {headers} = await axios({
        url: `${baseUrl}/blargimargarita`,
        validateStatus: null,
      });

      assert.ok(String(headers['content-type']).includes('application/json'));
    });

    it('should return unknown command for routes without a command mapping', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/location`,
        validateStatus: null,
      });

      assert.strictEqual(status, 404);
      assert.deepStrictEqual(data.value.error, 'unknown command');
      assert.match(data.value.message, /The requested resource could not be found/);
    });

    it('should return unknown command for ignored legacy routes', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/buttonup`,
        method: 'POST',
        validateStatus: null,
        data: {},
      });

      assert.strictEqual(status, 404);
      assert.deepStrictEqual(data.value.error, 'unknown command');
      assert.match(data.value.message, /The requested resource could not be found/);
    });

    it('should get 400 for bad parameters', async function () {
      await assert.rejects(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: {},
        }),
        /400/,
      );
    });

    it('should ignore special extra payload params in the right contexts', async function () {
      await axios({
        url: `${baseUrl}/session/foo/element/bar/value`,
        method: 'POST',
        data: {id: 'baz', sessionId: 'lol', value: ['a'], text: 'bar'},
      });

      await assert.rejects(
        axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {id: 'baz'},
        }),
        /400/,
      );

      // make sure adding the optional 'id' doesn't clobber a route where we
      // have an actual required 'id'
      await axios({
        url: `${baseUrl}/session/foo/frame`,
        method: 'POST',
        data: {id: 'baz'},
      });
    });

    it('should return the correct error even if driver does not throw', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/appium/settings`,
        method: 'GET',
        validateStatus: null,
      });
      assert.strictEqual(status, 500);
      assert.deepStrictEqual(data.value.error, 'unknown error');
      assert.deepStrictEqual(data.value.message, 'Mishandled Driver Error');
      assert.ok(!data.sessionId);
    });

    describe('w3c sendkeys migration', function () {
      it('should not accept value for sendkeys', async function () {
        await assert.rejects(
          axios({
            url: `${baseUrl}/session/foo/element/bar/value`,
            method: 'POST',
            data: {value: 'text to type'},
          }),
          /400/,
        );
      });
      it('should accept text for sendkeys', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {text: 'text to type'},
        });
        assert.deepStrictEqual(data.value, ['text to type', 'bar']);
      });
      it('should accept value and text for sendkeys, and use text', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {value: 'text to ignore', text: 'text to type'},
        });
        assert.deepStrictEqual(data.value, ['text to type', 'bar']);
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
        const desiredCapabilities = {a: 'b'};
        await assert.rejects(
          axios({
            url: `${baseUrl}/session`,
            method: 'POST',
            data: {desiredCapabilities},
          }),
          /500/,
        );
      });
      it('should allow create session with capabilities (W3C)', async function () {
        const w3cCapabilities = {alwaysMatch: {'appium:e': 'f'}};
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {capabilities: w3cCapabilities},
        });
        assert.ok(!data.status);
        assert.ok(!data.sessionId);
        assert.deepStrictEqual(data.value.capabilities, w3cCapabilities);
        assert.ok(data.value.sessionId);
        sessionId = data.value.sessionId;
      });

      describe('w3c endpoints', function () {
        let sessionUrl: string;

        beforeEach(async function () {
          // Start a W3C session
          const {value} = (
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
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              bad: 'params',
            },
          });
          assert.strictEqual(status, 400);

          const {error: w3cError, message, stacktrace} = data.value;
          assert.match(message, /following required parameter/);
          assert.match(stacktrace, /protocol\.(js|ts)/);
          assert.strictEqual(typeof w3cError, 'string');
          assert.strictEqual(w3cError, errors.InvalidArgumentError.error());
        });

        it(`should throw 405 exception if the command hasn't been implemented yet`, async function () {
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          assert.strictEqual(status, 405);

          const {error: w3cError, message, stacktrace} = data.value;
          assert.match(message, /Method has not yet been implemented/);
          assert.match(stacktrace, /protocol\.(js|ts)/);
          assert.strictEqual(typeof w3cError, 'string');
          assert.strictEqual(w3cError, errors.NotYetImplementedError.error());
          assert.match(message, /Method has not yet been implemented/);
        });

        it(`should throw 500 Unknown Error if the command throws an unexpected exception`, async function () {
          (driver as any).performActions = () => {
            throw new Error(`Didn't work`);
          };
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          assert.strictEqual(status, 500);

          const {error: w3cError, message, stacktrace} = data.value;
          assert.match(stacktrace, /protocol\.(js|ts)/);
          assert.strictEqual(typeof w3cError, 'string');
          assert.strictEqual(w3cError, errors.UnknownError.error());
          assert.match(message, /Didn't work/);

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
          const {data} = await axios.post(`${sessionUrl}/elements`, {
            using: 'whatever',
            value: 'whatever',
          });
          assert.deepStrictEqual(data.value, expectedValue);
          driver.findElements = findElementsBackup;
        });

        it(`should fail with a 408 error if it throws a TimeoutError exception`, async function () {
          const setUrlStub = sandbox.stub(driver, 'setUrl').callsFake(function () {
            throw new errors.TimeoutError();
          });
          const {status, data} = await axios({
            url: `${sessionUrl}/url`,
            method: 'POST',
            validateStatus: null,
            data: {
              url: 'https://example.com/',
            },
          });
          assert.strictEqual(status, 408);

          const {error: w3cError, message, stacktrace} = data.value;
          assert.match(stacktrace, /protocol\.(js|ts)/);
          assert.strictEqual(typeof w3cError, 'string');
          assert.strictEqual(w3cError, errors.TimeoutError.error());
          assert.match(message, /An operation did not complete before its timeout expired/);

          setUrlStub.restore();
        });

        it(`should pass with 200 HTTP status code if the command returns a value`, async function () {
          (driver as any).performActions = (actions: object[]) => 'It works ' + actions.join('');
          const {status, value, sessionId} = (
            await axios.post(`${sessionUrl}/actions`, {
              actions: ['a', 'b', 'c'],
            })
          ).data;
          assert.ok(!sessionId);
          assert.ok(!status);
          assert.strictEqual(value, 'It works abc');
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
            jwproxy = new JWProxy({server: TEST_HOST, port});
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

            const {status, value, sessionId} = (
              await axios.post(`${sessionUrl}/actions`, {
                actions: [1, 2, 3],
              })
            ).data;
            assert.deepStrictEqual(value, [1, 2, 3]);
            assert.ok(!status);
            assert.ok(!sessionId);
          });

          it('should return error if a proxied request returns a MJSONWP error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(500).json({
                sessionId,
                status: 6,
                value: 'A problem occurred',
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            assert.strictEqual(status, HTTPStatusCodes.NOT_FOUND);
            assert.match(JSON.stringify(data), /A problem occurred/);
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
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {actions: [1, 2, 3]},
            });
            assert.strictEqual(status, 500);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            assert.strictEqual(w3cError, 'unknown error');
            assert.match(stacktrace, /Some error occurred/);
            assert.strictEqual(errMessage, 'Some error occurred');
          });

          it('should return error if a proxied request returns a MJSONWP error response but HTTP status code is 200', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(200).json({
                sessionId: 'Fake Session Id',
                status: 7,
                value: 'A problem occurred',
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            assert.strictEqual(status, HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            assert.strictEqual(w3cError, 'no such element');
            assert.match(errMessage, /A problem occurred/);
            assert.ok(stacktrace);
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
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            assert.strictEqual(status, HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, stacktrace} = data.value;
            assert.strictEqual(w3cError, 'no such element');
            assert.match(stacktrace, /arbitrary stacktrace/);
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
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            assert.strictEqual(status, HTTPStatusCodes.INTERNAL_SERVER_ERROR);
            const {error: w3cError, stacktrace} = data.value;
            assert.strictEqual(w3cError, 'unknown error');
            assert.match(stacktrace, /arbitrary stacktrace/);
          });
        });
      });
    });

    it('should send 404 response for invalid session id', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      assert.strictEqual(status, 404);
      assert.deepStrictEqual(data.value.error, 'invalid session id');
      assert.deepStrictEqual(data.value.message, 'A session is either terminated or not started');
    });
  });

  describe('session Ids', function () {
    let driver: FakeDriver;
    let baseUrl: string;
    let teardown: () => Promise<void> | undefined;

    before(async function () {
      driver = new FakeDriver();
      const {baseUrl: baseUrlStr, setup, teardown: teardownFn} = await createServer(driver);
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

      const {data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
        validateStatus: null,
      });

      assert.ok(!data.sessionId);
    });

    it('should return a new session ID on create', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session`,
        method: 'POST',
        data: {
          capabilities: {
            alwaysMatch: {'appium:greeting': 'hello'},
            firstMatch: [{}],
          },
        },
      });

      try {
        assert.ok(data.value.sessionId);
        assert.strictEqual(data.value.sessionId.indexOf('fakeSession_'), 0);
        assert.deepStrictEqual(data.value.capabilities, {
          alwaysMatch: {'appium:greeting': 'hello'},
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
      } = await createServer(driver, {extraMethodMap: FakeDriver.newMethodMap});
      baseUrl = baseUrlStr;
      teardown = teardownFn;
      await setup();
    });

    afterEach(async function () {
      await teardown?.();
    });

    it('should give a nice error if proxying is set but no proxy function exists', async function () {
      (driver as any).canProxy = () => false;
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      assert.strictEqual(status, 500);
      assert.deepStrictEqual(data.value.error, 'unknown error');
      assert.deepStrictEqual(
        data.value.message,
        'Trying to proxy to a server but the driver is unable to proxy',
      );
    });

    it('should pass on any errors in proxying', async function () {
      (driver as any).proxyReqRes = async function () {
        throw new Error('foo');
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      assert.strictEqual(status, 500);
      assert.deepStrictEqual(data.value.error, 'unknown error');
      assert.match(data.value.message, /Proxy error: foo/);
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
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      assert.strictEqual(status, 500);
      assert.deepStrictEqual(data.value.error, 'unknown error');
      assert.deepStrictEqual(data.value.message, 'No such context found.');
    });

    it('should let the proxy handle req/res', async function () {
      (driver as any).proxyReqRes = async function (req: Request, res: Response) {
        res.status(200).json({custom: 'data'});
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      assert.strictEqual(status, 200);
      assert.deepStrictEqual(data, {custom: 'data'});
    });

    it('should avoid jsonwp proxying when path matches avoidance list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('^/session/[^/]+/url$')]];
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      assert.strictEqual(status, 200);
      assert.deepStrictEqual(data, {
        value: 'Navigated to: http://google.com',
      });
    });

    it('should fail if avoid proxy list is malformed in some way', async function () {
      async function badProxyAvoidanceList(list: RouteMatcher[]) {
        driver.getProxyAvoidList = () => list;
        const {status, data} = await axios({
          url: `${baseUrl}/session/${sessionId}/url`,
          method: 'POST',
          validateStatus: null,
          data: {url: 'http://google.com'},
        });

        assert.strictEqual(status, 500);
        assert.ok(data.value.message.includes('roxy'));
      }
      const lists = ['foo', [['foo']], [['BAR', /lol/]], [['GET', 'foo']]];
      for (const list of lists) {
        await badProxyAvoidanceList(list as RouteMatcher[]);
      }
    });

    it('should avoid proxying non-session commands even if not in the list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      const {status, data} = await axios({
        url: `${baseUrl}/status`,
      });

      assert.strictEqual(status, 200);
      assert.deepStrictEqual(data, {
        value: "I'm fine",
      });
    });

    it('should avoid proxying deleteSession commands', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      assert.strictEqual(driver.sessionId, sessionId);
      const {status} = await axios.delete(`${baseUrl}/session/${sessionId}`);

      assert.strictEqual(status, 200);
      assert.ok(!driver.sessionId);
      assert.strictEqual(driver.jwpProxyActive, false);
    });

    it('should avoid proxying when command spec specifies neverProxy', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/noproxy`,
        method: 'GET',
      });

      assert.strictEqual(status, 200);
      assert.deepStrictEqual(data, {
        value: 'This was not proxied',
      });
    });
  });
});
