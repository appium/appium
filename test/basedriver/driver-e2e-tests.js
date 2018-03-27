import _ from 'lodash';
import { server, routeConfiguringFunction, DeviceSettings } from '../..';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';

const should = chai.should();
chai.use(chaiAsPromised);

function baseDriverE2ETests (DriverClass, defaultCaps = {}) {
  describe('BaseDriver (e2e)', function () {
    let baseServer, d = new DriverClass();
    before(async function () {
      baseServer = await server(routeConfiguringFunction(d), 8181);
    });
    after(async function () {
      await baseServer.close();
    });

    function startSession (caps) {
      return request({
        url: 'http://localhost:8181/wd/hub/session',
        method: 'POST',
        json: {desiredCapabilities: caps, requiredCapabilities: {}},
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

    function getSession (id) {
      return request({
        url: `http://localhost:8181/wd/hub/session/${id}`,
        method: 'GET',
        json: true,
        simple: false
      });
    }

    describe('session handling', function () {
      it('should create session and retrieve a session id, then delete it', async function () {
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
        res.body.value.should.eql(defaultCaps);

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

    it.skip('should throw NYI for commands not implemented', async function () {
    });

    describe('command timeouts', function () {
      function startTimeoutSession (timeout) {
        let caps = _.clone(defaultCaps);
        caps.newCommandTimeout = timeout;
        return startSession(caps);
      }

      d.findElement = function () {
        return 'foo';
      }.bind(d);

      d.findElements = async function () {
        await B.delay(200);
        return ['foo'];
      }.bind(d);

      it('should set a default commandTimeout', async function () {
        let newSession = await startTimeoutSession();
        d.newCommandTimeoutMs.should.be.above(0);
        await endSession(newSession.sessionId);
      });

      it('should timeout on commands using commandTimeout cap', async function () {
        let newSession = await startTimeoutSession(0.25);

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

      it('should not timeout with commandTimeout of false', async function () {
        let newSession = await startTimeoutSession(0.1);
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

      it('should not timeout with commandTimeout of 0', async function () {
        d.newCommandTimeoutMs = 2;
        let newSession = await startTimeoutSession(0);

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
        res.status.should.equal(0);
        res = await endSession(newSession.sessionId);
        res.status.should.equal(0);

        d.newCommandTimeoutMs = 60 * 1000;
      });

      it('should not timeout if its just the command taking awhile', async function () {
        let newSession = await startTimeoutSession(0.25);
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

      it('should not have a timer running before or after a session', async function () {
        should.not.exist(d.noCommandTimer);
        let newSession = await startTimeoutSession(0.25);
        newSession.sessionId.should.equal(d.sessionId);
        should.exist(d.noCommandTimer);
        await endSession(newSession.sessionId);
        should.not.exist(d.noCommandTimer);
      });

    });

    describe('settings api', function () {
      before(function () {
        d.settings = new DeviceSettings({ignoreUnimportantViews: false});
      });
      it('should be able to get settings object', function () {
        d.settings.getSettings().ignoreUnimportantViews.should.be.false;
      });
      it('should throw error when updateSettings method is not defined', async function () {
        await d.settings.update({ignoreUnimportantViews: true}).should.eventually
                .be.rejectedWith('onSettingsUpdate');
      });
      it('should throw error for invalid update object', async function () {
        await d.settings.update('invalid json').should.eventually
                .be.rejectedWith('JSON');
      });
    });

    describe('unexpected exits', function () {
      it('should reject a current command when the driver crashes', async function () {
        d._oldGetStatus = d.getStatus;
        d.getStatus = async function () {
          await B.delay(5000);
        }.bind(d);
        let p = request({
          url: 'http://localhost:8181/wd/hub/status',
          method: 'GET',
          json: true,
          simple: false
        });
        // make sure that the request gets to the server before our shutdown
        await B.delay(100);
        d.startUnexpectedShutdown(new Error('Crashytimes'));
        let res = await p;
        res.status.should.equal(13);
        res.value.message.should.contain('Crashytimes');
        await d.onUnexpectedShutdown.should.be.rejectedWith('Crashytimes');
      });
    });

    describe('event timings', function () {
      it('should not add timings if not using opt-in cap', async function () {
        let session = await startSession(defaultCaps);
        let res = await getSession(session.sessionId);
        should.not.exist(res.events);
        await endSession(session.sessionId);
      });
      it('should add start session timings', async function () {
        let caps = Object.assign({}, defaultCaps, {eventTimings: true});
        let session = await startSession(caps);
        let res = (await getSession(session.sessionId)).value;
        should.exist(res.events);
        should.exist(res.events.newSessionRequested);
        should.exist(res.events.newSessionStarted);
        res.events.newSessionRequested[0].should.be.a('number');
        res.events.newSessionStarted[0].should.be.a('number');
        await endSession(session.sessionId);
      });
    });

  });
}

export default baseDriverE2ETests;
