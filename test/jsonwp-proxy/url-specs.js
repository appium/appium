// transpile:mocha
/* global describe:true, it:true */

import { JWProxy } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';


chai.should();
chai.use(chaiAsPromised);

describe('proxying full urls', function () {
  it('should translate host and port', function () {
    let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
    let j = new JWProxy();
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/status');
  });
  it('should translate the scheme', function () {
    let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
    let j = new JWProxy({scheme: 'HTTPS'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('https://localhost:4444/wd/hub/status');
  });
  it('should translate the base', function () {
    let incomingUrl = 'http://127.0.0.2:4723/wd/hub/status';
    let j = new JWProxy({base: ''});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/status');
  });
  it('should translate the session id', function () {
    let incomingUrl = 'http://127.0.0.2:4723/wd/hub/session/foobar/element';
    let j = new JWProxy({sessionId: 'barbaz'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
  });
  it('should error when translating session commands without session id', function () {
    let incomingUrl = 'http://127.0.0.2:4723/wd/hub/session/foobar/element';
    let j = new JWProxy();
    (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
  });
});

describe('proxying partial urls', function () {
  it('should proxy /status', function () {
    let incomingUrl = '/status';
    let j = new JWProxy();
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/status');
  });
  it('should proxy /session', function () {
    let incomingUrl = '/session';
    let j = new JWProxy();
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session');
  });
  it('should proxy /sessions', function () {
    let incomingUrl = '/sessions';
    let j = new JWProxy();
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/sessions');
  });
  it('should proxy session commands based off /session', function () {
    let incomingUrl = '/session/foobar/element';
    let j = new JWProxy({sessionId: 'barbaz'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
  });
  it('should error session commands based off /session without session id', function () {
    let incomingUrl = '/session/foobar/element';
    let j = new JWProxy();
    (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
  });
  it('should proxy session commands based off /wd/hub', function () {
    let incomingUrl = '/wd/hub/session/3d001db2-7987-42a7-975d-8d5d5304083f/timeouts/implicit_wait';
    let j = new JWProxy({sessionId: '123'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session/123/timeouts/implicit_wait');

  });
  it('should proxy session commands based off /session as ""', function () {
    let incomingUrl = '';
    let j = new JWProxy();
    (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
    j = new JWProxy({sessionId: '123'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session/123');
  });
  it('should proxy session commands without /session', function () {
    let incomingUrl = '/element';
    let j = new JWProxy({sessionId: 'barbaz'});
    let proxyUrl = j.getUrlForProxy(incomingUrl);
    proxyUrl.should.equal('http://localhost:4444/wd/hub/session/barbaz/element');
  });
  it('should error session commands without /session without session id', function () {
    let incomingUrl = '/element';
    let j = new JWProxy();
    (() => { j.getUrlForProxy(incomingUrl); }).should.throw('session id');
  });
});
