import {WDProxy} from '../../../lib';
import request from './mock-request';
import {isErrorType, errors} from '../../../lib/protocol/errors';
import {getTestPort, buildReqRes, TEST_HOST} from '@appium/driver-test-support';

const NEW_SESSION_BODY = {capabilities: {alwaysMatch: {}}};

describe('proxy', function () {
  let port;

  function mockProxy(opts = {}, fixtureOpts = {}) {
    // sets default server/port
    opts = {server: TEST_HOST, port, ...opts};
    let proxy = new WDProxy(opts);
    proxy.request = async function (reqOpts) {
      return await request(reqOpts, fixtureOpts);
    };
    return proxy;
  }

  before(async function () {
    port = await getTestPort();
  });

  it('should override default params', function () {
    let j = mockProxy({server: '127.0.0.2', port});
    j.server.should.equal('127.0.0.2');
    j.port.should.equal(port);
  });

  describe('getUrlForProxy', function () {
    it('should modify session id, host, and port', function () {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('http://host.com:1234/session/456/element/200/value').should.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
    });
    it('should prepend scheme, host and port if not provided', function () {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('/session/456/element/200/value').should.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
    });
    it('should respect nonstandard incoming request base path', function () {
      let j = mockProxy({sessionId: '123', reqBasePath: ''});
      j.getUrlForProxy('/session/456/element/200/value').should.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );

      j = mockProxy({sessionId: '123', reqBasePath: '/my/base/path'});
      j.getUrlForProxy('/my/base/path/session/456/element/200/value').should.eql(
        `http://${TEST_HOST}:${port}/session/123/element/200/value`
      );
    });
    it('should work with urls which do not have session ids', function () {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('http://host.com:1234/session').should.eql(
        `http://${TEST_HOST}:${port}/session`
      );

      let newUrl = j.getUrlForProxy('/session');
      newUrl.should.eql(`http://${TEST_HOST}:${port}/session`);
    });
    it('should throw an error if url requires a sessionId but its null', function () {
      let j = mockProxy();
      let e;
      try {
        j.getUrlForProxy('/session/456/element/200/value');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('without session id');
    });
    it('should not throw an error if url does not require a session id and its null', function () {
      let j = mockProxy();
      let newUrl = j.getUrlForProxy('/status');

      should.exist(newUrl);
    });
  });

  describe('straight proxy', function () {
    it('should successfully proxy straight', async function () {
      let j = mockProxy();
      let {status, data} = await j.proxy('/status', 'GET');
      status.should.equal(200);
      data.should.eql({value: {foo: 'bar'}});
    });
    it('should save session id on session creation', async function () {
      let j = mockProxy();
      let {status, data} = await j.proxy('/session', 'POST', NEW_SESSION_BODY);
      status.should.equal(200);
      data.should.eql({value: {sessionId: '123', browserName: 'boo'}});
      j.sessionId.should.equal('123');
    });
    it('should throw an error if sessionid not included in new session response', async function () {
      let j = mockProxy({}, {noSessionId: true});
      await j.proxy('/session', 'POST', NEW_SESSION_BODY).should.be.rejectedWith('sessionId');
    });
    it('should overwrite session id when new session generates one', async function () {
      let j = mockProxy({sessionId: '456'});
      let {status, data} = await j.proxy('/session', 'POST', NEW_SESSION_BODY);
      status.should.equal(200);
      data.should.eql({value: {sessionId: '123', browserName: 'boo'}});
      j.sessionId.should.equal('123');
    });
    it('should throw an error if the w3c value prop is not a part of the response', async function () {
      let j = mockProxy({sessionId: '123'});
      await j.proxy('/novalue', 'GET').should.be.rejectedWith('value');
    });
    it('should pass along request errors', function () {
      let j = mockProxy({sessionId: '123'});
      j.proxy('/badurl', 'GET').should.be.rejectedWith('Could not proxy');
    });
    it('should proxy error responses and codes without throwing', async function () {
      let j = mockProxy({sessionId: '123'});
      const {status, data} = await j.proxy('/element/bad/text', 'GET');
      status.should.equal(400);
      data.should.eql({value: {error: 'invalid element state'}});
    });
  });

  describe('command proxy', function () {
    it('should successfully proxy command', async function () {
      let j = mockProxy();
      let res = await j.command('/status', 'GET');
      res.should.eql({foo: 'bar'});
    });
    it('should pass along request errors', function () {
      let j = mockProxy({sessionId: '123'});
      j.command('/badurl', 'GET').should.be.rejectedWith('Could not proxy');
    });
    it('should throw when a command fails', async function () {
      let j = mockProxy({sessionId: '123'});
      let e = null;
      try {
        await j.command('/element/bad/text', 'GET');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      isErrorType(e, errors.InvalidElementStateError).should.be.true;
      e.error.should.eql('invalid element state');
    });
  });

  describe('req/res proxy', function () {
    it('should successfully proxy via req and send to res', async function () {
      let j = mockProxy();
      let [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      res.headers['content-type'].should.equal('application/json; charset=utf-8');
      res.sentCode.should.equal(200);
      res.sentBody.should.eql({value: {foo: 'bar'}});
    });
    it('should rewrite the inner session id so it doesnt change', async function () {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/element/200/attribute/value', 'GET');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({value: 'foobar'});
    });
    it('should still work even if session id in url is different from the stored one', async function () {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/session/456/element/200/attribute/value', 'POST');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({value: 'foobar'});
    });
    it('should pass through urls that do not require session IDs', async function () {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({value: {foo: 'bar'}});
    });
    it('should proxy strange responses', async function () {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/nochrome', 'GET');
      await j.proxyReqRes(req, res);
      res.sentCode.should.equal(500);
      res.sentBody.should.eql({value: {error: 'unknown error', message: 'chrome not reachable'}});
    });
  });
});
