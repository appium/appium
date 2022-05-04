import {JWProxy} from '../../../lib';
import {getTestPort, TEST_HOST, createAppiumURL} from '@appium/test-support';
import _ from 'lodash';

describe('JWProxy', function () {
  let port;

  let createTestURL;
  let testStatusURL;
  let createTestSessionURL;
  let testNewSessionURL;

  const PROXY_HOST = '127.0.0.2';
  const PROXY_PORT = 4723;

  const createProxyURL = createAppiumURL(PROXY_HOST, PROXY_PORT);
  const PROXY_STATUS_URL = createProxyURL('', 'status');

  function createJWProxy(opts = {}) {
    return new JWProxy({server: TEST_HOST, port, ...opts});
  }

  before(async function () {
    port = await getTestPort();
    createTestURL = createAppiumURL(TEST_HOST, port);
    testStatusURL = createTestURL('', 'status');
    createTestSessionURL = createTestURL(_, '');
    testNewSessionURL = createTestURL('', 'session');
  });

  describe('proxying full urls', function () {
    it('should translate host and port', function () {
      let incomingUrl = PROXY_STATUS_URL;
      let j = createJWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(testStatusURL);
    });
    it('should translate the scheme', function () {
      let incomingUrl = PROXY_STATUS_URL;
      let j = createJWProxy({scheme: 'HTTPS'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createAppiumURL(`https://${TEST_HOST}`, port, '', 'status'));
    });
    it('should translate the base', function () {
      let incomingUrl = PROXY_STATUS_URL;
      let j = createJWProxy({base: ''});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(testStatusURL);
    });
    it('should translate the session id', function () {
      let incomingUrl = createProxyURL('foobar', 'element');
      let j = createJWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('barbaz', 'element'));
    });
    it('should error when translating session commands without session id', function () {
      let incomingUrl = createProxyURL('foobar', 'element');
      let j = createJWProxy();
      (() => {
        j.getUrlForProxy(incomingUrl);
      }).should.throw('session id');
    });
  });

  describe('proxying partial urls', function () {
    it('should proxy /status', function () {
      let incomingUrl = '/status';
      let j = createJWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(testStatusURL);
    });
    it('should proxy /session', function () {
      let incomingUrl = '/session';
      let j = createJWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(testNewSessionURL);
    });
    it('should proxy /sessions', function () {
      let incomingUrl = '/sessions';
      let j = createJWProxy();
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('', 'sessions'));
    });
    it('should proxy session commands based off /session', function () {
      let incomingUrl = '/session/foobar/element';
      let j = createJWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('barbaz', 'element'));
    });
    it('should error session commands based off /session without session id', function () {
      let incomingUrl = '/session/foobar/element';
      let j = createJWProxy();
      (() => {
        j.getUrlForProxy(incomingUrl);
      }).should.throw('session id');
    });
    it('should proxy session commands based off ', function () {
      let incomingUrl = '/session/3d001db2-7987-42a7-975d-8d5d5304083f/timeouts/implicit_wait';
      let j = createJWProxy({sessionId: '123'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('123', 'timeouts/implicit_wait'));
    });
    it('should proxy session commands based off /session as ""', function () {
      let incomingUrl = '';
      let j = createJWProxy();
      (() => {
        j.getUrlForProxy(incomingUrl);
      }).should.throw('session id');
      j = createJWProxy({sessionId: '123'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestSessionURL('123'));
    });
    it('should proxy session commands without /session', function () {
      let incomingUrl = '/element';
      let j = createJWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('barbaz', 'element'));
    });
    it(`should proxy session commands when '/session' is in the url`, function () {
      let incomingUrl =
        '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      let j = createJWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('barbaz', 'cookie/session-something-or-other'));
    });
    it(`should proxy session commands when '/session' is in the url and not base on the original url`, function () {
      let incomingUrl =
        '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      let j = createJWProxy({sessionId: 'barbaz'});
      let proxyUrl = j.getUrlForProxy(incomingUrl);
      proxyUrl.should.equal(createTestURL('barbaz', 'cookie/session-something-or-other'));
    });
    it('should error session commands without /session without session id', function () {
      let incomingUrl = '/element';
      let j = createJWProxy();
      (() => {
        j.getUrlForProxy(incomingUrl);
      }).should.throw('session id');
    });
  });
});
