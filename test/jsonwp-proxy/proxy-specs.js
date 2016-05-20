// transpile:mocha
/* global describe:true, it:true */

import { JWProxy } from '../..';
import request from './mock-request';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';


const should = chai.should();
chai.use(chaiAsPromised);

function buildReqRes (url, method, body) {
  let req = {originalUrl: url, method, body};
  let res = {};
  res.headers = {};
  res.set = (k, v) => { res[k] = v; };
  res.status = (code) => {
    res.sentCode = code;
    return res;
  };
  res.send = (body) => {
    try {
      body = JSON.parse(body);
    } catch (e) {}
    res.sentBody = body;
  };
  return [req, res];
}

function mockProxy (opts = {}) {
  let proxy = new JWProxy(opts);
  proxy.request = async function (...args) {
    return await request(...args);
  };
  return proxy;
}

describe('proxy', () => {
  it('should override default params', () => {
    let j = mockProxy({server: '127.0.0.2'});
    j.server.should.equal('127.0.0.2');
    j.port.should.equal(4444);
  });
  it('should save session id on session creation', async () => {
    let j = mockProxy();
    let [res, body] = await j.proxy('/session', 'POST', {desiredCapabilities: {}});
    res.statusCode.should.equal(200);
    body.should.eql({status: 0, sessionId: '123', value: {browserName: 'boo'}});
    j.sessionId.should.equal('123');
  });
  it('should save session id on session creation with 303', async () => {
    let j = mockProxy();
    let [res, body] = await j.proxy('/session', 'POST', {desiredCapabilities: {redirect: true}});
    res.statusCode.should.equal(303);
    body.should.eql('http://localhost:4444/wd/hub/session/123');
    j.sessionId.should.equal('123');
  });
  describe('getUrlForProxy', () => {
    it('should modify session id, host, and port', async () => {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('http://host.com:1234/wd/hub/session/456/element/200/value')
       .should.eql('http://localhost:4444/wd/hub/session/123/element/200/value');
    });
    it('should prepend scheme, host and port if not provided', async () => {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('/wd/hub/session/456/element/200/value')
       .should.eql('http://localhost:4444/wd/hub/session/123/element/200/value');
    });
    it('should work with urls which do not have sessiopn ids', async () => {
      let j = mockProxy({sessionId: '123'});
      j.getUrlForProxy('http://host.com:1234/wd/hub/session')
       .should.eql('http://localhost:4444/wd/hub/session');

      let newUrl = j.getUrlForProxy('/wd/hub/session');
      newUrl.should.eql('http://localhost:4444/wd/hub/session');
    });
    it('should throw an error if url requires a sessionId but its null', async () => {
      let j = mockProxy();
      let e;
      try {
        j.getUrlForProxy('/wd/hub/session/456/element/200/value');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('without session id');
    });
    it('should not throw an error if url does not require a session id and its null', async () => {
      let j = mockProxy();
      let newUrl = j.getUrlForProxy('/wd/hub/status');

      should.exist(newUrl);
    });
  });
  describe('straight proxy', () => {
    it('should successfully proxy straight', async () => {
      let j = mockProxy();
      let [res, body] = await j.proxy('/status', 'GET');
      res.statusCode.should.equal(200);
      body.should.eql({status: 0, value: {foo: 'bar'}});
    });
    it('should pass along request errors', async () => {
      let j = mockProxy({sessionId: '123'});
      j.proxy('/badurl', 'GET').should.eventually.be.rejectedWith("Could not proxy");
    });
    it('should proxy error responses and codes', async () => {
      let j = mockProxy({sessionId: '123'});
      let [res, body] = await j.proxy('/element/bad/text', 'GET');
      res.statusCode.should.equal(500);
      body.should.eql({status: 11, value: {message: 'Invisible element'}});
    });
  });
  describe('command proxy', () => {
    it('should successfully proxy command', async () => {
      let j = mockProxy();
      let res = await j.command('/status', 'GET');
      res.should.eql({foo: 'bar'});
    });
    it('should pass along request errors', async () => {
      let j = mockProxy({sessionId: '123'});
      j.command('/badurl', 'GET').should.eventually.be.rejectedWith("Could not proxy");
    });
    it('should throw when a command fails', async () => {
      let j = mockProxy({sessionId: '123'});
      let e = null;
      try {
        await j.command('/element/bad/text', 'GET');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('Original error: Invisible element');
      e.value.should.eql({message: 'Invisible element'});
      e.status.should.equal(11);
    });
    it('should return response body when a command fails with a 200', async () => {
      let j = mockProxy({sessionId: '123'});
      let res = await j.command('/element/200/text', 'GET');
      res.value.should.eql({message: 'Invisible element'});
      res.status.should.eql(11);
    });
    it('should throw when a command fails with a 100', async () => {
      let j = mockProxy({sessionId: '123'});
      let e = null;
      try {
        await j.command('/session/badchrome/nochrome', 'GET');
      } catch (err) {
        e = err;
      }
      should.exist(e);
      e.message.should.contain('Original error: chrome not reachable');
      e.value.should.eql({message: 'chrome not reachable'});
      e.status.should.equal(0);
    });
  });
  describe('req/res proxy', () => {
    it('should successfully proxy via req and send to res', async () => {
      let j = mockProxy();
      let [req, res] = buildReqRes('/status', 'GET');
      await j.proxyReqRes(req, res);
      res.headers['Content-type'].should.equal('application/json');
      res.sentCode.should.equal(200);
      res.sentBody.should.eql({status: 0, value: {foo: 'bar'}});
    });
    it('should rewrite the inner session id so it doesnt change', async () => {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/element/200/value', 'GET');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({status: 0, value: 'foobar', sessionId: '123'});
    });
    it('should rewrite the inner session id with sessionId in url', async () => {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/wd/hub/session/456/element/200/value', 'POST');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({status: 0, value: 'foobar', sessionId: '456'});
    });
    it('should pass through urls that do not require session IDs', async () => {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/wd/hub/status', 'GET');
      await j.proxyReqRes(req, res);
      res.sentBody.should.eql({status: 0, value: {'foo':'bar'}});
    });
    it('should proxy strange responses', async () => {
      let j = mockProxy({sessionId: '123'});
      let [req, res] = buildReqRes('/nochrome', 'GET');
      await j.proxyReqRes(req, res);
      res.sentCode.should.equal(100);
      res.sentBody.should.eql({status: 0, value: {message: 'chrome not reachable'}});
    });
  });
});
