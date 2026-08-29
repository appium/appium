import assert from 'node:assert/strict';
import {before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';

import {WebDriverProxy} from '../../../lib/index.js';
import {errors, isErrorType} from '../../../lib/protocol/errors.js';
import {type MockRequestOpts, request} from './mock-request.js';

function buildReqRes(url: string, method: string, body?: any): [any, any] {
  const req = {originalUrl: url, method, body};
  const res: any = {};
  res.headers = {};
  res.setHeader = (k: string, v: string) => {
    res.headers[k] = v;
  };
  res.status = (code: number) => {
    res.sentCode = code;
    return res;
  };
  res.send = (bodyStr: any) => {
    try {
      bodyStr = JSON.parse(bodyStr);
    } catch {
      // ignore
    }
    res.sentBody = bodyStr;
  };
  res.json = (bodyObj: any) => {
    res.sentBody = bodyObj;
  };
  return [req, res];
}

describe('proxy', function () {
  let port: number;

  before(async function () {
    port = await getTestPort();
  });

  function mockProxy(opts: any = {}) {
    // sets default server/port
    opts = {server: TEST_HOST, port, ...opts};
    const proxy = new WebDriverProxy(opts);
    (proxy as any).request = async function (...args: any[]) {
      return await request(args[0] as MockRequestOpts);
    };
    return proxy;
  }

  it('should override default params', function () {
    const j = mockProxy({server: '127.0.0.2', port});
    assert.strictEqual(j.server, '127.0.0.2');
    assert.strictEqual(j.port, port);
  });
  it('should save session id on session creation', async function () {
    const j = mockProxy();
    const [res, body] = await j.proxy('/session', 'POST', {
      desiredCapabilities: {},
    });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(body, {status: 0, sessionId: '123', value: {browserName: 'boo'}});
    assert.strictEqual(j.sessionId, '123');
  });
  describe('getUrlForProxy', function () {
    it('should modify session id, host, and port', function () {
      assert.strictEqual(
        mockProxy({sessionId: '123'}).getUrlForProxy('http://host.com:1234/session/456/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );
    });
    it('should prepend scheme, host and port if not provided', function () {
      const j = mockProxy({sessionId: '123'});
      assert.strictEqual(
        j.getUrlForProxy('/session/456/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );
      assert.strictEqual(
        j.getUrlForProxy('/session/456/appium/settings', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/appium/settings`,
      );
    });
    it('should prepend scheme, host, port and session if not provided', function () {
      assert.strictEqual(
        mockProxy({sessionId: '123'}).getUrlForProxy('/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );
    });
    it('should keep query parameters', function () {
      assert.strictEqual(
        mockProxy({sessionId: '123'}).getUrlForProxy('/element/200/value?foo=1&bar=2', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value?foo=1&bar=2`,
      );
    });
    it('should fix legacy proxy urls if reqBasePath is unset', function () {
      const j = mockProxy({sessionId: '123', reqBasePath: ''});
      assert.strictEqual(
        j.getUrlForProxy('/wd/hub/session/456/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );
      assert.strictEqual(
        j.getUrlForProxy('/yolo/session/456/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );
    });
    it('should respect nonstandard incoming request base path', function () {
      assert.strictEqual(
        mockProxy({sessionId: '123', reqBasePath: ''}).getUrlForProxy('/session/456/element/200/value', 'POST'),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );

      assert.strictEqual(
        mockProxy({sessionId: '123', reqBasePath: '/my/base/path'}).getUrlForProxy(
          '/my/base/path/session/456/element/200/value',
          'POST',
        ),
        `http://${TEST_HOST}:${port}/session/123/element/200/value`,
      );

      assert.strictEqual(
        mockProxy({sessionId: '123', reqBasePath: '/wd/hub'}).getUrlForProxy('/wd/hub/session/456', 'GET'),
        `http://${TEST_HOST}:${port}/session/123`,
      );

      assert.strictEqual(
        mockProxy({reqBasePath: '/my/base/path'}).getUrlForProxy('/my/base/path/session', 'POST'),
        `http://${TEST_HOST}:${port}/session`,
      );
    });
    it('should work with urls which do not have session ids', function () {
      const j = mockProxy({sessionId: '123'});
      assert.strictEqual(
        j.getUrlForProxy('http://host.com:1234/session', 'POST'),
        `http://${TEST_HOST}:${port}/session`,
      );

      assert.strictEqual(j.getUrlForProxy('/session', 'POST'), `http://${TEST_HOST}:${port}/session`);
      assert.strictEqual(j.getUrlForProxy('/appium/sessions', 'GET'), `http://${TEST_HOST}:${port}/appium/sessions`);
    });
    it('should throw an error if url requires a sessionId but its null', function () {
      const j = mockProxy();
      assert.throws(() => {
        j.getUrlForProxy('/session/456/element/200/value', 'POST');
      }, /not set/);
    });
    it('should not throw an error if url does not require a session id and its null', function () {
      const newUrl = mockProxy().getUrlForProxy('/status', 'GET');
      assert.ok(newUrl);
    });
  });
  describe('straight proxy', function () {
    it('should successfully proxy straight', async function () {
      const j = mockProxy();
      const [res, body] = await j.proxy('/status', 'GET');
      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(body, {status: 0, value: {foo: 'bar'}});
    });
    it('should apply custom headers to downstream requests', async function () {
      const customHeaders = {
        'x-custom-header': 'foobar',
        'user-agent': 'my-appium-client',
      };
      let capturedConfig: any;
      const j = mockProxy({headers: customHeaders});
      (j as any).request = async function (config: MockRequestOpts) {
        capturedConfig = config;
        return await request(config);
      };
      await j.proxy('/status', 'GET');
      assert.ok(Object.hasOwn(capturedConfig, 'headers'));
      assert.strictEqual(capturedConfig.headers['x-custom-header'], 'foobar');
      assert.strictEqual(capturedConfig.headers['user-agent'], 'my-appium-client');
      assert.strictEqual(capturedConfig.headers['content-type'], 'application/json; charset=utf-8');
      assert.strictEqual(capturedConfig.headers.accept, 'application/json, */*');
    });
    it('should pass along request errors', async function () {
      const j = mockProxy({sessionId: '123'});
      await assert.rejects(j.proxy('/badurl', 'GET'), /Could not proxy/);
    });
    it('should proxy error responses and codes', async function () {
      const j = mockProxy({sessionId: '123'});
      try {
        await j.proxy('/element/bad/text', 'GET');
      } catch (e: any) {
        assert.strictEqual(isErrorType(e.getActualError(), errors.ElementNotVisibleError), true);
      }
    });
  });
  describe('command proxy', function () {
    it('should successfully proxy command', async function () {
      const j = mockProxy();
      const res = await j.command('/status', 'GET');
      assert.deepStrictEqual(res, {foo: 'bar'});
    });
    it('should pass along request errors', async function () {
      const j = mockProxy({sessionId: '123'});
      await assert.rejects(j.command('/badurl', 'GET'), /Could not proxy/);
    });
    it('should throw when a command fails', async function () {
      const j = mockProxy({sessionId: '123'});
      await assert.rejects(j.command('/element/bad/text', 'GET'), /Invisible element/);
    });
    it('should throw when a command fails with a 200 because the status is not 0', async function () {
      const j = mockProxy({sessionId: '123'});
      let e: any = null;
      try {
        await j.command('/element/200/text', 'GET');
      } catch (err: any) {
        e = err;
      }
      assert.ok(e);
      assert.strictEqual(e.error, 'element not visible');
    });
    it('should throw when a command fails with a 100', async function () {
      const j = mockProxy({sessionId: '123'});
      let e: any = null;
      try {
        await j.command('/session/badchrome/nochrome', 'GET');
      } catch (err: any) {
        e = err;
      }
      assert.ok(e);
      assert.ok(e.message.includes('chrome not reachable'));
    });
  });
  describe('req/res proxy', function () {
    it('should successfully proxy via req and send to res', async function () {
      const j = mockProxy();
      const [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8');
      assert.strictEqual(res.sentCode, 200);
      assert.deepStrictEqual(res.sentBody, {value: {foo: 'bar'}});
    });
    it('should delete the inner session id', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/element/200/value', 'GET');
      await j.proxyReqRes(req, res);
      assert.deepStrictEqual(res.sentBody, {value: 'foobar'});
    });
    it('should pass through urls that do not require session IDs', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      assert.deepStrictEqual(res.sentBody, {value: {foo: 'bar'}});
    });
    it('should proxy strange responses', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/nochrome', 'GET');
      await j.proxyReqRes(req, res);
      assert.strictEqual(res.sentCode, 100);
      assert.deepStrictEqual(res.sentBody, {value: {message: 'chrome not reachable'}});
    });
    it('should not proxy post request with invalid body', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/nochrome', 'POST', 'invalid request');
      await j.proxyReqRes(req, res);
      assert.strictEqual(res.sentCode, 500);
      assert.ok(Object.hasOwn(res.sentBody, 'value'));
      assert.strictEqual((res.sentBody as any).value.error, 'unknown error');
      assert.strictEqual(
        (res.sentBody as any).value.message,
        'Cannot interpret the request body as valid JSON. Check the server log for more details.',
      );
      assert.match((res.sentBody as any).value.stacktrace, /^UnknownError:*/);
    });
  });
});
