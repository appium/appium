// transpile:mocha

import { AppiumDriver, getAppiumRouter } from '../lib/appium';
import { FakeDriver } from 'appium-fake-driver';
import { TEST_FAKE_APP } from './helpers';
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { XCUITestDriver } from 'appium-xcuitest-driver';
import { IosDriver } from 'appium-ios-driver';
import { sleep } from 'asyncbox';

const should = chai.should();
chai.use(chaiAsPromised);

const insertAppiumPrefixes = AppiumDriver.prototype.insertAppiumPrefixes;

const BASE_CAPS = {platformName: 'Fake', deviceName: 'Fake', app: TEST_FAKE_APP};
const W3C_PREFIXED_CAPS = {...insertAppiumPrefixes(BASE_CAPS)};
const W3C_CAPS = {
  alwaysMatch:{...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};
const SESSION_ID = 1;

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
      let appium;
      let mockFakeDriver;
      beforeEach(() => {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async () => {
        mockFakeDriver.restore();
        await appium.deleteSession(SESSION_ID);
      });

      it('should call inner driver\'s createSession with desired capabilities', async () => {
        mockFakeDriver.expects("createSession")
          .once().withExactArgs(BASE_CAPS, undefined, undefined, [])
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it('should call inner driver\'s createSession with desired and default capabilities', async () => {
        let defaultCaps = {deviceName: 'Emulator'}
          , allCaps = _.extend(_.clone(defaultCaps), BASE_CAPS);
        appium.args.defaultCapabilities = defaultCaps;
        mockFakeDriver.expects("createSession")
          .once().withArgs(allCaps)
          .returns([SESSION_ID, allCaps]);
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
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);
        mockFakeDriver.verify();
      });
      it('should kill all other sessions if sessionOverride is on', async () => {
        appium.args.sessionOverride = true;

        // mock three sessions that should be removed when the new one is created
        let fakeDrivers = [new FakeDriver(),
                           new FakeDriver(),
                           new FakeDriver()];
        let mockFakeDrivers = _.map(fakeDrivers, (fd) => {return sinon.mock(fd);});
        mockFakeDrivers[0].expects('deleteSession')
          .once();
        mockFakeDrivers[1].expects('deleteSession')
          .once()
          .throws('Cannot shut down Android driver; it has already shut down');
        mockFakeDrivers[2].expects('deleteSession')
          .once();
        appium.sessions['abc-123-xyz'] = fakeDrivers[0];
        appium.sessions['xyz-321-abc'] = fakeDrivers[1];
        appium.sessions['123-abc-xyz'] = fakeDrivers[2];

        let sessions = await appium.getSessions();
        sessions.should.have.length(3);

        mockFakeDriver.expects("createSession")
          .once().withExactArgs(BASE_CAPS, undefined, undefined, [])
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(BASE_CAPS);

        sessions = await appium.getSessions();
        sessions.should.have.length(1);

        for (let mfd of mockFakeDrivers) {
          mfd.verify();
        }
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument, if provided', async function () {
        mockFakeDriver.expects("createSession")
          .once().withArgs(undefined, undefined, W3C_CAPS)
          .returns([SESSION_ID, BASE_CAPS]);
        await appium.createSession(undefined, undefined, W3C_CAPS);
        mockFakeDriver.verify();
      });
      it('should call "createSession" with W3C capabilities argument with additional provided parameters', async function () {
        let w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:someOtherParm': 'someOtherParm',
          },
        };
        mockFakeDriver.expects("createSession")
          .once().withArgs(undefined, undefined, {
            alwaysMatch: {
              ...w3cCaps.alwaysMatch,
              'appium:someOtherParm': 'someOtherParm',
            },
            firstMatch: [{}],
          })
          .returns([SESSION_ID, insertAppiumPrefixes(BASE_CAPS)]);

        await appium.createSession(undefined, undefined, w3cCaps);
        mockFakeDriver.verify();
      });
    });
    describe('getCaps()', () => {
      let appium;
      beforeEach(() => {
        [appium] = getDriverAndFakeDriver();
      });
      it('should return JSONWP caps unchanged if only JSONWP caps provided', function () {
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(BASE_CAPS);
        desiredCaps.should.deep.equal(BASE_CAPS);
        newJsonwpCaps.should.deep.equal(BASE_CAPS);
        should.not.exist(newW3CCapabilities);
      });
      it('should return W3C caps unchanged if only W3C caps were provided', function () {
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(undefined, W3C_CAPS);
        desiredCaps.should.deep.equal(BASE_CAPS);
        should.not.exist(newJsonwpCaps);
        newW3CCapabilities.should.deep.equal(W3C_CAPS);
      });
      it('should return JSONWP and W3C caps if both were provided', function () {
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(BASE_CAPS, W3C_CAPS);
        desiredCaps.should.deep.equal(BASE_CAPS);
        newJsonwpCaps.should.deep.equal(BASE_CAPS);
        newW3CCapabilities.should.deep.equal(W3C_CAPS);
      });
      it('should merge the capabilities together if some are different', function () {
        let jsonwpCaps = {
          ...BASE_CAPS,
          foo: 'bar',
        };
        let w3cCaps = {
          ...W3C_CAPS,
          alwaysMatch: {
            ...W3C_CAPS.alwaysMatch,
            'appium:hello': 'world',
          }
        };
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(jsonwpCaps, w3cCaps);

        let expectedCaps = {
          ...jsonwpCaps,
          'hello': 'world'
        };

        desiredCaps.should.deep.equal(expectedCaps);
        newJsonwpCaps.should.deep.equal(expectedCaps);
        newW3CCapabilities.should.deep.equal({
          alwaysMatch: {...insertAppiumPrefixes(expectedCaps)},
          firstMatch: [{}],
        });
      });
      it('should merge the capabilities together and give preference to W3C if some are matching', function () {
        // Add caps to JSONWP caps
        let jsonwpCaps = {
          foo: 'bar',
          ...BASE_CAPS,
        };

        // Add caps to W3C caps
        let w3cCaps = {
          alwaysMatch: {
            hello: 'world',
            foo: 'BAR',
            ...BASE_CAPS,
          },
          firstMatch: [{}],
        };

        // Expected result is that w3c caps override jsonwp caps
        let expectedDesiredCaps = {
          ...jsonwpCaps,
          ...w3cCaps.alwaysMatch,
        };

        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(jsonwpCaps, w3cCaps);
        desiredCaps.foo.should.equal('BAR');
        desiredCaps.should.deep.equal(expectedDesiredCaps);
        newJsonwpCaps.should.deep.equal(expectedDesiredCaps);
        newW3CCapabilities.should.deep.equal({
          alwaysMatch: insertAppiumPrefixes(expectedDesiredCaps),
          firstMatch: [{}],
        });
      });
      it('should include default capabilities in results', function () {
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(BASE_CAPS, W3C_CAPS, {}, {foo: 'bar'});
        desiredCaps.should.deep.equal({foo: 'bar', ...BASE_CAPS});
        newJsonwpCaps.should.deep.equal({foo: 'bar', ...BASE_CAPS});
        newW3CCapabilities.alwaysMatch.should.deep.equal({'appium:foo': 'bar', ...insertAppiumPrefixes(BASE_CAPS)});
      });
      it('should reject if W3C caps are not passing constraints', function () {
        (() => appium.getCaps(BASE_CAPS, W3C_CAPS, {hello: {presence: true}})).should.throw(/'hello' can't be blank/);
      });
      it('should only accept W3C caps that have passing constraints', function () {
        let w3cCaps = {
          ...W3C_CAPS,
          firstMatch: [
            {foo: 'bar'},
            {hello: 'world'},
          ],
        };
        let {desiredCaps, newJsonwpCaps, newW3CCapabilities} = appium.getCaps(BASE_CAPS, w3cCaps, {hello: {presence: true}});
        const expectedResult = {hello: 'world', ...BASE_CAPS};
        desiredCaps.should.deep.equal(expectedResult);
        newJsonwpCaps.should.deep.equal(expectedResult);
        newW3CCapabilities.alwaysMatch.should.deep.equal(insertAppiumPrefixes(expectedResult));
      });
    });
    describe('deleteSession', () => {
      let appium;
      let mockFakeDriver;
      beforeEach(() => {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(() => {
        mockFakeDriver.restore();
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
        const [sessionId] = await appium.createSession(BASE_CAPS);
        mockFakeDriver.expects("deleteSession")
          .once().withExactArgs(sessionId, [])
          .returns();
        await appium.deleteSession(sessionId);
        mockFakeDriver.verify();

        // cleanup, since we faked the delete session call
        await mockFakeDriver.object.deleteSession();
      });
    });
    describe('getSessions', () => {
      let appium;
      let sessions;
      before(() => {
        appium = new AppiumDriver({});
      });
      afterEach(async () => {
        for (let session of sessions) {
          await appium.deleteSession(session.id);
        }
      });
      it('should return an empty array of sessions', async () => {
        sessions = await appium.getSessions();
        sessions.should.be.an.array;
        sessions.should.be.empty;
      });
      it('should return sessions created', async () => {
        let session1 = await appium.createSession(_.extend(_.clone(BASE_CAPS), {cap: 'value'}));
        let session2 = await appium.createSession(_.extend(_.clone(BASE_CAPS), {cap: 'other value'}));

        sessions = await appium.getSessions();
        sessions.should.be.an.array;
        sessions.should.have.length(2);
        sessions[0].id.should.equal(session1[0]);
        sessions[0].capabilities.should.eql(session1[1]);
        sessions[1].id.should.equal(session2[0]);
        sessions[1].capabilities.should.eql(session2[1]);
      });
    });
    describe('applyAppiumPrefixes()', function () {
      let appium;
      before(() => {
        appium = new AppiumDriver({});
      });

      it('should apply prefixes to non-standard capabilities', function () {
        appium.insertAppiumPrefixes({
          someCap: 'someCap',
        }).should.deep.equal({
          'appium:someCap': 'someCap',
        });
      });
      it('should not apply prefixes to standard capabilities', function () {
        appium.insertAppiumPrefixes({
          browserName: 'BrowserName',
          platformName: 'PlatformName',
        }).should.deep.equal({
          browserName: 'BrowserName',
          platformName: 'PlatformName',
        });
      });
      it('should not apply prefixes to capabilities that already have a prefix', function () {
        appium.insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
        }).should.deep.equal({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
        });
      });
      it('should apply prefixes to capabilities non-prefixed, non-standard capabilities; should not apply prefixes to any capabilities', function () {
        appium.insertAppiumPrefixes({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
          browserName: 'BrowserName',
          platformName: 'PlatformName',
          someOtherCap: 'someOtherCap',
          yetAnotherCap: 'yetAnotherCap',
        }).should.deep.equal({
          'appium:someCap': 'someCap',
          'moz:someOtherCap': 'someOtherCap',
          browserName: 'BrowserName',
          platformName: 'PlatformName',
          'appium:someOtherCap': 'someOtherCap',
          'appium:yetAnotherCap': 'yetAnotherCap',
        });
      });
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
    describe('sessionExists', () => {
    });
    describe('attachUnexpectedShutdownHandler', () => {
      let appium
        , mockFakeDriver;
      beforeEach(() => {
        [appium, mockFakeDriver] = getDriverAndFakeDriver();
      });
      afterEach(async () => {
        await mockFakeDriver.object.deleteSession();
        mockFakeDriver.restore();
        appium.args.defaultCapabilities = {};
      });

      it('should remove session if inner driver unexpectedly exits with an error', async () => {
        let [sessionId,] = await appium.createSession(_.clone(BASE_CAPS)); // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].unexpectedShutdownDeferred.reject(new Error("Oops"));
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
      it('should remove session if inner driver unexpectedly exits with no error', async () => {
        let [sessionId,] = await appium.createSession(_.clone(BASE_CAPS)); // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].unexpectedShutdownDeferred.resolve();
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.not.contain(sessionId);
      });
      it('should not remove session if inner driver cancels unexpected exit', async () => {
        let [sessionId,] = await appium.createSession(_.clone(BASE_CAPS)); // eslint-disable-line comma-spacing
        _.keys(appium.sessions).should.contain(sessionId);
        appium.sessions[sessionId].onUnexpectedShutdown.cancel();
        // let event loop spin so rejection is handled
        await sleep(1);
        _.keys(appium.sessions).should.contain(sessionId);
      });
    });
    describe('getDriverForCaps', () => {
      it('should not blow up if user does not provide platformName', () => {
        let appium = new AppiumDriver({});
        (() => { appium.getDriverForCaps({}); }).should.throw(/platformName/);
      });
      it('should get XCUITestDriver driver for automationName of XCUITest', () => {
        let appium = new AppiumDriver({});
        let driver = appium.getDriverForCaps({
          platformName: 'iOS',
          automationName: 'XCUITest'
        });
        driver.should.be.an.instanceof(Function);
        driver.should.equal(XCUITestDriver);
      });
      it('should get iosdriver for ios < 10', () => {
        let appium = new AppiumDriver({});
        let caps = {
          platformName: 'iOS',
          platformVersion: '8.0',
        };
        let driver = appium.getDriverForCaps(caps);
        driver.should.be.an.instanceof(Function);
        driver.should.equal(IosDriver);

        caps.platformVersion = '8.1';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(IosDriver);

        caps.platformVersion = '9.4';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(IosDriver);

        caps.platformVersion = '';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(IosDriver);

        caps.platformVersion = 'foo';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(IosDriver);

        delete caps.platformVersion;
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(IosDriver);
      });
      it('should get xcuitestdriver for ios >= 10', () => {
        let appium = new AppiumDriver({});
        let caps = {
          platformName: 'iOS',
          platformVersion: '10',
        };
        let driver = appium.getDriverForCaps(caps);
        driver.should.be.an.instanceof(Function);
        driver.should.equal(XCUITestDriver);

        caps.platformVersion = '10.0';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(XCUITestDriver);

        caps.platformVersion = '10.1';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(XCUITestDriver);

        caps.platformVersion = '12.14';
        driver = appium.getDriverForCaps(caps);
        driver.should.equal(XCUITestDriver);
      });
    });
  });
});
