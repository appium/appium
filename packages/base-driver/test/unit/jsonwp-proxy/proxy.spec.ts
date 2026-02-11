import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {JWProxy} from '../../../lib';
import request from './mock-request';
import {isErrorType, errors} from '../../../lib/protocol/errors';
import {getTestPort, TEST_HOST} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

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
    opts = {server: TEST_HOST, port, ...opts};
    const proxy = new JWProxy(opts);
    (proxy as any).request = async function (...args: any[]) {
      return (await request(...args)) as any;
    };
    return proxy;
  }

  it('should override default params', function () {
    const j = mockProxy({server: '127.0.0.2', port});
    expect(j.server).to.equal('127.0.0.2');
    expect(j.port).to.equal(port);
  });
  it('should save session id on session creation', async function () {
    const j = mockProxy();
    const [res, body] = await j.proxy('/session', 'POST', {
      desiredCapabilities: {},
    });
    expect(res.statusCode).to.equal(200);
    expect(body).to.eql({status: 0, sessionId: '123', value: {browserName: 'boo'}});
    expect(j.sessionId).to.equal('123');
  });
  describe('getUrlForProxy', function () {
    it('should modify session id, host, and port', function () {
      expect(
        mockProxy({sessionId: '123'}).getUrlForProxy(
          'http://host.com:1234/session/456/element/200/value',
          'POST'
        )
      ).to.eql(`http://${TEST_HOST}:${port}/session/123/element/200/value`);
    });
    it('should prepend scheme, host and port if not provided', function () {
      const j = mockProxy({sessionId: '123'});
      expect(j.getUrlForProxy('/session/456/element/200/value', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
      expect(j.getUrlForProxy('/session/456/appium/settings', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session/123/appium/settings`
      );
    });
    it('should prepend scheme, host, port and session if not provided', function () {
      expect(
        mockProxy({sessionId: '123'}).getUrlForProxy('/element/200/value', 'POST')
      ).to.eql(`http://${TEST_HOST}:${port}/session/123/element/200/value`);
    });
    it('should keep query parameters', function () {
      expect(
        mockProxy({sessionId: '123'}).getUrlForProxy(
          '/element/200/value?foo=1&bar=2',
          'POST'
        )
      ).to.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value?foo=1&bar=2`
      );
    });
    it('should fix legacy proxy urls if reqBasePath is unset', function () {
      const j = mockProxy({sessionId: '123', reqBasePath: ''});
      expect(j.getUrlForProxy('/wd/hub/session/456/element/200/value', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
      expect(j.getUrlForProxy('/yolo/session/456/element/200/value', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
    });
    it('should respect nonstandard incoming request base path', function () {
      expect(
        mockProxy({sessionId: '123', reqBasePath: ''}).getUrlForProxy(
          '/session/456/element/200/value',
          'POST'
        )
      ).to.eql(`http://${TEST_HOST}:${port}/session/123/element/200/value`);

      expect(
        mockProxy({sessionId: '123', reqBasePath: '/my/base/path'}).getUrlForProxy(
          '/my/base/path/session/456/element/200/value',
          'POST'
        )
      ).to.eql(`http://${TEST_HOST}:${port}/session/123/element/200/value`);

      expect(
        mockProxy({sessionId: '123', reqBasePath: '/wd/hub'}).getUrlForProxy(
          '/wd/hub/session/456',
          'GET'
        )
      ).to.eql(`http://${TEST_HOST}:${port}/session/123`);

      expect(
        mockProxy({reqBasePath: '/my/base/path'}).getUrlForProxy(
          '/my/base/path/session',
          'POST'
        )
      ).to.eql(`http://${TEST_HOST}:${port}/session`);
    });
    it('should work with urls which do not have session ids', function () {
      const j = mockProxy({sessionId: '123'});
      expect(j.getUrlForProxy('http://host.com:1234/session', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session`
      );

      expect(j.getUrlForProxy('/session', 'POST')).to.eql(
        `http://${TEST_HOST}:${port}/session`
      );
      expect(j.getUrlForProxy('/appium/sessions', 'GET')).to.eql(
        `http://${TEST_HOST}:${port}/appium/sessions`
      );
    });
    it('should throw an error if url requires a sessionId but its null', function () {
      const j = mockProxy();
      expect(() => {
        j.getUrlForProxy('/session/456/element/200/value', 'POST');
      }).to.throw(/not set/);
    });
    it('should not throw an error if url does not require a session id and its null', function () {
      const newUrl = mockProxy().getUrlForProxy('/status', 'GET');
      expect(newUrl).to.exist;
    });
  });
  describe('straight proxy', function () {
    it('should successfully proxy straight', async function () {
      const j = mockProxy();
      const [res, body] = await j.proxy('/status', 'GET');
      expect(res.statusCode).to.equal(200);
      expect(body).to.eql({status: 0, value: {foo: 'bar'}});
    });
    it('should apply custom headers to downstream requests', async function () {
      const customHeaders = {
        'x-custom-header': 'foobar',
        'user-agent': 'my-appium-client',
      };
      let capturedConfig: any;
      const j = mockProxy({headers: customHeaders});
      (j as any).request = async function (config: any) {
        capturedConfig = config;
        return (await request(config)) as any;
      };
      await j.proxy('/status', 'GET');
      expect(capturedConfig).to.have.property('headers');
      expect(capturedConfig.headers).to.have.property('x-custom-header', 'foobar');
      expect(capturedConfig.headers).to.have.property('user-agent', 'my-appium-client');
      expect(capturedConfig.headers).to.have.property(
        'content-type',
        'application/json; charset=utf-8'
      );
      expect(capturedConfig.headers).to.have.property(
        'accept',
        'application/json, */*'
      );
    });
    it('should pass along request errors', function () {
      const j = mockProxy({sessionId: '123'});
      return expect(j.proxy('/badurl', 'GET')).to.be.rejectedWith('Could not proxy');
    });
    it('should proxy error responses and codes', async function () {
      const j = mockProxy({sessionId: '123'});
      try {
        await j.proxy('/element/bad/text', 'GET');
      } catch (e: any) {
        expect(isErrorType(e.getActualError(), errors.ElementNotVisibleError)).to.be.true;
      }
    });
  });
  describe('command proxy', function () {
    it('should successfully proxy command', async function () {
      const j = mockProxy();
      const res = await j.command('/status', 'GET');
      expect(res).to.eql({foo: 'bar'});
    });
    it('should pass along request errors', function () {
      const j = mockProxy({sessionId: '123'});
      return expect(j.command('/badurl', 'GET')).to.be.rejectedWith('Could not proxy');
    });
    it('should throw when a command fails', async function () {
      const j = mockProxy({sessionId: '123'});
      await expect(j.command('/element/bad/text', 'GET')).to.be.rejectedWith(
        /Invisible element/
      );
    });
    it('should throw when a command fails with a 200 because the status is not 0', async function () {
      const j = mockProxy({sessionId: '123'});
      let e: any = null;
      try {
        await j.command('/element/200/text', 'GET');
      } catch (err: any) {
        e = err;
      }
      expect(e).to.exist;
      expect(e.error).to.eql('element not visible');
    });
    it('should throw when a command fails with a 100', async function () {
      const j = mockProxy({sessionId: '123'});
      let e: any = null;
      try {
        await j.command('/session/badchrome/nochrome', 'GET');
      } catch (err: any) {
        e = err;
      }
      expect(e).to.exist;
      expect(e.message).to.contain('chrome not reachable');
    });
  });
  describe('req/res proxy', function () {
    it('should successfully proxy via req and send to res', async function () {
      const j = mockProxy();
      const [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
      expect(res.sentCode).to.equal(200);
      expect(res.sentBody).to.eql({value: {foo: 'bar'}});
    });
    it('should delete the inner session id', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/element/200/value', 'GET');
      await j.proxyReqRes(req, res);
      expect(res.sentBody).to.eql({value: 'foobar'});
    });
    it('should pass through urls that do not require session IDs', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      expect(res.sentBody).to.eql({value: {foo: 'bar'}});
    });
    it('should proxy strange responses', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/nochrome', 'GET');
      await j.proxyReqRes(req, res);
      expect(res.sentCode).to.equal(100);
      expect(res.sentBody).to.eql({value: {message: 'chrome not reachable'}});
    });
    it('should not proxy post request with invalid body', async function () {
      const j = mockProxy({sessionId: '123'});
      const [req, res] = buildReqRes('/nochrome', 'POST', 'invalid request');
      await j.proxyReqRes(req, res);
      expect(res.sentCode).to.equal(500);
      expect(res.sentBody).to.have.property('value');
      expect((res.sentBody as any).value).to.include({
        error: 'unknown error',
        message:
          'Cannot interpret the request body as valid JSON. Check the server log for more details.',
      });
      expect((res.sentBody as any).value.stacktrace).to.match(/^UnknownError:*/);
    });
  });
});
