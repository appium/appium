import assert from 'node:assert/strict';
import {before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';

import {WebDriverProxy} from '../../../lib/index.js';
import {createAppiumURL} from '../../helpers.js';

describe('WebDriverProxy', function () {
  let port: number;
  let createTestURL: (sessionId: string, path: string) => string;
  let testStatusURL: string;
  let createTestSessionURL: (sessionId: string) => string;
  let testNewSessionURL: string;

  const PROXY_HOST = '127.0.0.2';
  const PROXY_PORT = 4723;

  const createProxyURL = createAppiumURL(PROXY_HOST, PROXY_PORT);
  const PROXY_STATUS_URL = createProxyURL('', 'status');

  function createWDProxy(opts: any = {}) {
    return new WebDriverProxy({server: TEST_HOST, port, ...opts});
  }

  before(async function () {
    port = await getTestPort();
    createTestURL = createAppiumURL(TEST_HOST, port);
    testStatusURL = createTestURL('', 'status');
    createTestSessionURL = (sessionId: string) => createTestURL(sessionId, '');
    testNewSessionURL = createTestURL('', 'session');
  });

  describe('proxying full urls', function () {
    it('should translate host and port', function () {
      const incomingUrl = PROXY_STATUS_URL;
      const j = createWDProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      assert.strictEqual(proxyUrl, testStatusURL);
    });
    it('should translate the scheme', function () {
      const incomingUrl = PROXY_STATUS_URL;
      const j = createWDProxy({scheme: 'HTTPS'});
      const proxyUrl = j.getUrlForProxy(incomingUrl);
      assert.strictEqual(proxyUrl, createAppiumURL(`https://${TEST_HOST}`, port, '', 'status'));
    });
    it('should translate the base', function () {
      const incomingUrl = PROXY_STATUS_URL;
      const j = createWDProxy({base: ''});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      assert.strictEqual(proxyUrl, testStatusURL);
    });
    it('should translate the session id', function () {
      const incomingUrl = createProxyURL('foobar', 'element');
      const j = createWDProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('barbaz', 'element'));
    });
    it('should error when translating session commands without session id', function () {
      const incomingUrl = createProxyURL('foobar', 'element');
      const j = createWDProxy();
      assert.throws(() => j.getUrlForProxy(incomingUrl, 'POST'), /not set/);
    });
  });

  describe('proxying partial urls', function () {
    it('should proxy /status', function () {
      const incomingUrl = '/status';
      const j = createWDProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      assert.strictEqual(proxyUrl, testStatusURL);
    });
    it('should proxy /session', function () {
      const incomingUrl = '/session';
      const j = createWDProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl);
      assert.strictEqual(proxyUrl, testNewSessionURL);
    });
    it('should proxy session commands based off /session', function () {
      const incomingUrl = '/session/foobar/element';
      const j = createWDProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('barbaz', 'element'));
    });
    it('should error session commands based off /session without session id', function () {
      const incomingUrl = '/session/foobar/element';
      const j = createWDProxy();
      assert.throws(() => j.getUrlForProxy(incomingUrl, 'POST'), /not set/);
    });
    it('should proxy session commands based off ', function () {
      const incomingUrl = '/session/3d001db2-7987-42a7-975d-8d5d5304083f/timeouts/implicit_wait';
      const j = createWDProxy({sessionId: '123'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('123', 'timeouts/implicit_wait'));
    });
    it('should proxy session commands based off /session as ""', function () {
      const incomingUrl = '';
      const j = createWDProxy();
      assert.throws(() => j.getUrlForProxy(incomingUrl, 'GET'), /not set/);
      const j2 = createWDProxy({sessionId: '123'});
      const proxyUrl = j2.getUrlForProxy(incomingUrl, 'GET');
      assert.strictEqual(proxyUrl, createTestSessionURL('123'));
    });
    it('should proxy session commands without /session', function () {
      const incomingUrl = '/element';
      const j = createWDProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('barbaz', 'element'));
    });
    it(`should proxy session commands when '/session' is in the url`, function () {
      const incomingUrl = '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      const j = createWDProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('barbaz', 'cookie/session-something-or-other'));
    });
    it(`should proxy session commands when '/session' is in the url and not base on the original url`, function () {
      const incomingUrl = '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      const j = createWDProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      assert.strictEqual(proxyUrl, createTestURL('barbaz', 'cookie/session-something-or-other'));
    });
    it('should error session commands without /session without session id', function () {
      const incomingUrl = '/element';
      const j = createWDProxy();
      assert.throws(() => j.getUrlForProxy(incomingUrl, 'POST'), /not set/);
    });
  });
});
