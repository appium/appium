import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {JWProxy} from '../../../lib';
import {getTestPort, TEST_HOST, createAppiumURL} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

describe('JWProxy', function () {
  let port: number;
  let createTestURL: (sessionId: string, path: string) => string;
  let testStatusURL: string;
  let createTestSessionURL: (sessionId: string) => string;
  let testNewSessionURL: string;

  const PROXY_HOST = '127.0.0.2';
  const PROXY_PORT = 4723;

  const createProxyURL = createAppiumURL(PROXY_HOST, PROXY_PORT);
  const PROXY_STATUS_URL = createProxyURL('', 'status');

  function createJWProxy(opts: any = {}) {
    return new JWProxy({server: TEST_HOST, port, ...opts});
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
      const j = createJWProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      expect(proxyUrl).to.equal(testStatusURL);
    });
    it('should translate the scheme', function () {
      const incomingUrl = PROXY_STATUS_URL;
      const j = createJWProxy({scheme: 'HTTPS'});
      const proxyUrl = j.getUrlForProxy(incomingUrl);
      expect(proxyUrl).to.equal(
        createAppiumURL(`https://${TEST_HOST}`, port, '', 'status')
      );
    });
    it('should translate the base', function () {
      const incomingUrl = PROXY_STATUS_URL;
      const j = createJWProxy({base: ''});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      expect(proxyUrl).to.equal(testStatusURL);
    });
    it('should translate the session id', function () {
      const incomingUrl = createProxyURL('foobar', 'element');
      const j = createJWProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(createTestURL('barbaz', 'element'));
    });
    it('should error when translating session commands without session id', function () {
      const incomingUrl = createProxyURL('foobar', 'element');
      const j = createJWProxy();
      expect(() => j.getUrlForProxy(incomingUrl, 'POST')).to.throw('not set');
    });
  });

  describe('proxying partial urls', function () {
    it('should proxy /status', function () {
      const incomingUrl = '/status';
      const j = createJWProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'GET');
      expect(proxyUrl).to.equal(testStatusURL);
    });
    it('should proxy /session', function () {
      const incomingUrl = '/session';
      const j = createJWProxy();
      const proxyUrl = j.getUrlForProxy(incomingUrl);
      expect(proxyUrl).to.equal(testNewSessionURL);
    });
    it('should proxy session commands based off /session', function () {
      const incomingUrl = '/session/foobar/element';
      const j = createJWProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(createTestURL('barbaz', 'element'));
    });
    it('should error session commands based off /session without session id', function () {
      const incomingUrl = '/session/foobar/element';
      const j = createJWProxy();
      expect(() => j.getUrlForProxy(incomingUrl, 'POST')).to.throw('not set');
    });
    it('should proxy session commands based off ', function () {
      const incomingUrl =
        '/session/3d001db2-7987-42a7-975d-8d5d5304083f/timeouts/implicit_wait';
      const j = createJWProxy({sessionId: '123'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(createTestURL('123', 'timeouts/implicit_wait'));
    });
    it('should proxy session commands based off /session as ""', function () {
      const incomingUrl = '';
      const j = createJWProxy();
      expect(() => j.getUrlForProxy(incomingUrl, 'GET')).to.throw('not set');
      const j2 = createJWProxy({sessionId: '123'});
      const proxyUrl = j2.getUrlForProxy(incomingUrl, 'GET');
      expect(proxyUrl).to.equal(createTestSessionURL('123'));
    });
    it('should proxy session commands without /session', function () {
      const incomingUrl = '/element';
      const j = createJWProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(createTestURL('barbaz', 'element'));
    });
    it(`should proxy session commands when '/session' is in the url`, function () {
      const incomingUrl =
        '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      const j = createJWProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(
        createTestURL('barbaz', 'cookie/session-something-or-other')
      );
    });
    it(`should proxy session commands when '/session' is in the url and not base on the original url`, function () {
      const incomingUrl =
        '/session/82a9b7da-faaf-4a1d-8ef3-5e4fb5812200/cookie/session-something-or-other';
      const j = createJWProxy({sessionId: 'barbaz'});
      const proxyUrl = j.getUrlForProxy(incomingUrl, 'POST');
      expect(proxyUrl).to.equal(
        createTestURL('barbaz', 'cookie/session-something-or-other')
      );
    });
    it('should error session commands without /session without session id', function () {
      const incomingUrl = '/element';
      const j = createJWProxy();
      expect(() => j.getUrlForProxy(incomingUrl, 'POST')).to.throw('not set');
    });
  });
});
