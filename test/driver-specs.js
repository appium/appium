// transpile:mocha

import { BaseDriver } from '../..';
import { server } from 'appium-express';
import { routeConfiguringFunction } from 'mobile-json-wire-protocol';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';

const should = chai.should();
chai.use(chaiAsPromised);

describe('BaseDriver', () => {
  it('should return a sessionId from createSession', async () => {
    let d = new BaseDriver();
    let sessId = await d.createSession({});
    should.exist(sessId);
    sessId.should.be.a('string');
    sessId.length.should.be.above(5);
  });

  it('should not be able to start two sessions without closing the first', async () => {
    let d = new BaseDriver();
    await d.createSession({});
    await d.createSession({}).should.eventually.be.rejectedWith('session');
  });

  it('should be able to delete a session', async () => {
    let d = new BaseDriver();
    let sessionId1 = await d.createSession({});
    await d.deleteSession();
    should.equal(d.sessionId, null);
    let sessionId2 = await d.createSession({});
    sessionId1.should.not.eql(sessionId2);
  });
});

describe('BaseDriver via HTTP', () => {
  let baseServer, d = new BaseDriver();
  before(async () => {
    baseServer = await server(routeConfiguringFunction(d), 8181);
  });
  after(() => {
    baseServer.close();
  });

  it('should create session and retrieve a session id', async () => {
    let res = await request({
      url: 'http://localhost:8181/wd/hub/session',
      method: 'POST',
      json: {desiredCapabilities: {}, requiredCapabilities: {}},
      simple: false,
      resolveWithFullResponse: true
    });
    res.statusCode.should.equal(200);
    res.body.status.should.equal(0);
    should.exist(res.body.sessionId);
    res.body.value.should.eql({});
  });
});
