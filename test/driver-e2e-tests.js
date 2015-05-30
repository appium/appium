import _ from 'lodash';
import { server } from 'appium-express';
import { routeConfiguringFunction } from 'mobile-json-wire-protocol';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mochawait';
import B from 'bluebird';

const should = chai.should();
chai.use(chaiAsPromised);

function baseDriverE2ETests (DriverClass, defaultCaps = {}) {
  describe('BaseDriver (e2e)', () => {
    let baseServer, d = new DriverClass();
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
          json: {desiredCapabilities: defaultCaps, requiredCapabilities: {}},
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
        let caps = _.clone(defaultCaps);
        caps.newCommandTimeout = timeout;
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

      it('should not have a timer running before or after a session', async () => {
        should.not.exist(d.noCommandTimer);
        let newSession = await startSession(0.25);
        newSession.sessionId.should.equal(d.sessionId);
        should.exist(d.noCommandTimer);
        await endSession(newSession.sessionId);
        should.not.exist(d.noCommandTimer);
      });

    });

    describe('settings api', () => {
      // TODO port over settings tests
    });

  });
}

export default baseDriverE2ETests;
