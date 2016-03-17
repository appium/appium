// transpile:mocha

import { AppiumDriver, getAppiumRouter } from '../lib/appium';
import { FakeDriver } from 'appium-fake-driver';
import { TEST_FAKE_APP } from './helpers';
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const BASE_CAPS = {platformName: 'Fake', deviceName: 'Fake', app: TEST_FAKE_APP};

describe('AppiumDriver', () => {
  describe('getAppiumRouter', () => {
    it('should return a route configuring function', async () => {
      let routeConfiguringFunction = getAppiumRouter({});
      routeConfiguringFunction.should.be.a.function;
    });
  });

  describe('AppiumDriver', () => {
    function getDriverAndFakeDriver () {
      let appium = new AppiumDriver({});
      let fakeDriver = new FakeDriver();
      let mockFakeDriver = sinon.mock(fakeDriver);
      appium.getDriverForCaps = function (/*args*/) {
        return () => {
          return fakeDriver;
        };
      };
      return [appium, mockFakeDriver];
    }
    describe('createSession', () => {
      let appium
        , mockFakeDriver;
      beforeEach(() => {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(() => {
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });

      it('should call inner driver\'s createSession with desired capabilities', async () => {
        mockFakeDriver.expects("createSession")
          .once().withExactArgs(BASE_CAPS, undefined, [])
          .returns([1, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it('should call inner driver\'s createSession with desired and default capabilities', async () => {
        let defaultCaps = {deviceName: 'Emulator'}
          , allCaps = _.extend(_.clone(defaultCaps), BASE_CAPS);
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects("createSession")
          .once().withArgs(allCaps)
          .returns([1, allCaps]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it('should call inner driver\'s createSession with desired and default capabilities without overriding caps', async () => {
        // a default capability with the same key as a desired capability
        // should do nothing
        let defaultCaps = {platformName: 'Ersatz'};
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects("createSession")
          .once().withArgs(BASE_CAPS)
          .returns([1, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
    });
    describe('deleteSession', () => {
      let appium
        , mockFakeDriver;
      beforeEach(() => {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(() => {
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });
      it('should remove the session if it is found', async () => {
        let [sessionId] = await appium.createSession(BASE_CAPS);
        let sessions = await appium.getSessions();
        sessions.should.have.length(1);
        await appium.deleteSession(sessionId);
        sessions = await appium.getSessions();
        sessions.should.have.length(0);
      });
      it('should call inner driver\'s deleteSession method', async () => {
        let [sessionId] = await appium.createSession(BASE_CAPS);
        mockFakeDriver.expects("deleteSession")
          .once().withExactArgs()
          .returns();
        await appium.deleteSession(sessionId);
        mockFakeDriver.verify();
      });
    });
    describe('getSessions', () => {
      let appium;
      before(() => {
        appium = new AppiumDriver({});
      });
      it('should return an empty array of sessions', async () => {
        let sessions = await appium.getSessions();
        sessions.should.be.an.array;
        sessions.should.be.empty;
      });
      it('should return sessions created', async () => {
        let session1 = await appium.createSession(_.extend(_.clone(BASE_CAPS), {cap: 'value'}));
        let session2 = await appium.createSession(_.extend(_.clone(BASE_CAPS), {cap: 'other value'}));
        let sessions = await appium.getSessions();
        sessions.should.be.an.array;
        sessions.should.have.length(2);
        sessions[0].id.should.equal(session1[0]);
        sessions[0].capabilities.should.eql(session1[1]);
        sessions[1].id.should.equal(session2[0]);
        sessions[1].capabilities.should.eql(session2[1]);
      });
      describe('getStatus', () => {
        let appium;
        before(() => {
          appium = new AppiumDriver({});
        });
        it('should return a status', async () => {
          let status = await appium.getStatus();
          status.build.should.exist;
          status.build.version.should.exist;
        });
      });
    });
    describe('sessionExists', () => {
    });
    describe('getDriverForCaps', () => {
      it('should not blow up if user doesnt provide platformName', () => {
        let appium = new AppiumDriver({});
        (() => { appium.getDriverForCaps({}); }).should.throw(/platformName/);
      });
    });
  });
});
