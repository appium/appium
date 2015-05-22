// transpile:mocha

import { BaseDriver } from '../..';
import { server } from 'appium-express';
import { routeConfiguringFunction } from 'mobile-json-wire-protocol';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';
import B from 'bluebird';

const should = chai.should();
chai.use(chaiAsPromised);

describe('BaseDriver', () => {

  let d;

  beforeEach(() => {
    d = new BaseDriver();
  });

  it('should return a sessionId from createSession', async () => {
    let [sessId] = await d.createSession({});
    should.exist(sessId);
    sessId.should.be.a('string');
    sessId.length.should.be.above(5);
  });

  it('should not be able to start two sessions without closing the first', async () => {
    await d.createSession({});
    await d.createSession({}).should.eventually.be.rejectedWith('session');
  });

  it('should be able to delete a session', async () => {
    let sessionId1 = await d.createSession({});
    await d.deleteSession();
    should.equal(d.sessionId, null);
    let sessionId2 = await d.createSession({});
    sessionId1.should.not.eql(sessionId2);
  });

  it('should get the current session', async () => {
    let [,caps] = await d.createSession({});
    caps.should.equal(await d.getSession());
  });

  it('should return sessions if no session exists', async () => {
    let sessions = await d.getSessions();
    sessions.length.should.equal(0);
  });

  it('should return sessions', async () => {
    await d.createSession({a: 'cap'});
    let sessions = await d.getSessions();

    sessions.length.should.equal(1);
    sessions[0].should.eql({
      id: d.sessionId,
      capabilities: {a: 'cap'}
    });
  });

  it.skip('should emit an unexpected end session event', async () => {
  });

  describe('command queue', () => {
    let d = new BaseDriver();
    let waitMs = 10;
    d.getStatus = async () => {
      await B.delay(waitMs);
      return Date.now();
    }.bind(d);

    d.getSessions = async () => {
      await B.delay(waitMs);
      throw new Error("multipass");
    }.bind(d);

    it('should queue commands and execute/respond in the order received', async () => {
      let numCmds = 10;
      let cmds = [];
      for (let i = 0; i < numCmds; i++) {
        cmds.push(d.execute('getStatus'));
      }
      let results = await B.all(cmds);
      for (let i = 1; i < numCmds; i++) {
        if (results[i] <= results[i - 1]) {
          throw new Error("Got result out of order");
        }
      }
    });

    it('should handle errors correctly when queuing', async () => {
      let numCmds = 10;
      let cmds = [];
      for (let i = 0; i < numCmds; i++) {
        if (i === 5) {
          cmds.push(d.execute('getSessions'));
        } else {
          cmds.push(d.execute('getStatus'));
        }
      }
      let results = await B.settle(cmds);
      for (let i = 1; i < 5; i++) {
        if (results[i].value() <= results[i - 1].value()) {
          throw new Error("Got result out of order");
        }
      }
      results[5].reason().message.should.contain("multipass");
      for (let i = 7; i < numCmds; i++) {
        if (results[i].value() <= results[i - 1].value()) {
          throw new Error("Got result out of order");
        }
      }
    });

    it('should not care if queue empties for a bit', async () => {
      let numCmds = 10;
      let cmds = [];
      for (let i = 0; i < numCmds; i++) {
        cmds.push(d.execute('getStatus'));
      }
      let results = await B.all(cmds);
      cmds = [];
      for (let i = 0; i < numCmds; i++) {
        cmds.push(d.execute('getStatus'));
      }
      results = await B.all(cmds);
      for (let i = 1; i < numCmds; i++) {
        if (results[i] <= results[i - 1]) {
          throw new Error("Got result out of order");
        }
      }
    });

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

  describe('session handling', () => {
    it('should create session and retrieve a session id, then delete it', async () => {
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

      res = await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
        method: 'DELETE',
        json: true,
        simple: false,
        resolveWithFullResponse: true
      });

      res.statusCode.should.equal(200);
      res.body.status.should.equal(0);
      should.equal(d.sessionId, null);
    });
  });

  it.skip('should throw NYI for commands not implemented', async () => {
  });

  describe('command timeouts', () => {
    function startSession (timeout) {
      let caps = {newCommandTimeout: timeout};
      return request({
        url: 'http://localhost:8181/wd/hub/session',
        method: 'POST',
        json: {desiredCapabilities: caps, requiredCapabilities: {}},
        simple: false
      });
    }

    function endSession (id) {
      return request({
        url: `http://localhost:8181/wd/hub/session/${id}`,
        method: 'DELETE',
        json: true,
        simple: false
      });
    }

    d.findElement = function () {
      return 'foo';
    }.bind(d);

    d.findElements = async function () {
      await B.delay(200);
      return ['foo'];
    }.bind(d);

    it.skip('should timeout on commands using default commandTimeout', async () => {
    });

    it('should timeout on commands using commandTimeout cap', async () => {
      let newSession = await startSession(0.25);
      await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}/element`,
        method: 'POST',
        json: {using: 'name', value: 'foo'},
      });
      await B.delay(400);
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
        method: 'GET',
        json: true,
        simple: false
      });
      res.status.should.equal(6);
      should.equal(d.sessionId, null);
      res = await endSession(newSession.sessionId);
      res.status.should.equal(6);
    });

    it('should not timeout with commandTimeout of false', async () => {
      let newSession = await startSession(0.1);
      let start = Date.now();
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}/elements`,
        method: 'POST',
        json: {using: 'name', value: 'foo'},
      });
      (Date.now() - start).should.be.above(150);
      res.value.should.eql(['foo']);
      await endSession(newSession.sessionId);
    });

    it.skip('should not timeout with commandTimeout of 0', async () => {
    });

    it('should not timeout if its just the command taking awhile', async () => {
      let newSession = await startSession(0.25);
      await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}/element`,
        method: 'POST',
        json: {using: 'name', value: 'foo'},
      });
      await B.delay(400);
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${d.sessionId}`,
        method: 'GET',
        json: true,
        simple: false
      });
      res.status.should.equal(6);
      should.equal(d.sessionId, null);
      res = await endSession(newSession.sessionId);
      res.status.should.equal(6);
    });

  });

  describe('settings api', () => {
    // TODO port over settings tests
  });

});
