import _ from 'lodash';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import { DeviceSettings } from '../..';
import sinon from 'sinon';


const should = chai.should();
chai.use(chaiAsPromised);

// wrap these tests in a function so we can export the tests and re-use them
// for actual driver implementations
function baseDriverUnitTests (DriverClass, defaultCaps = {}) {
  const w3cCaps = {
    alwaysMatch: Object.assign({}, defaultCaps, {
      platformName: 'Fake',
      deviceName: 'Commodore 64',
    }),
    firstMatch: [{}],
  };

  describe('BaseDriver', function () {
    let d;
    beforeEach(function () {
      d = new DriverClass();
    });
    afterEach(async function () {
      await d.deleteSession();
    });

    it('should return an empty status object', async function () {
      let status = await d.getStatus();
      status.should.eql({});
    });

    it('should return a sessionId from createSession', async function () {
      let [sessId] = await d.createSession(defaultCaps);
      should.exist(sessId);
      sessId.should.be.a('string');
      sessId.length.should.be.above(5);
    });

    it('should not be able to start two sessions without closing the first', async function () {
      await d.createSession(defaultCaps);
      await d.createSession(defaultCaps).should.eventually.be.rejectedWith('session');
    });

    it('should be able to delete a session', async function () {
      let sessionId1 = await d.createSession(defaultCaps);
      await d.deleteSession();
      should.equal(d.sessionId, null);
      let sessionId2 = await d.createSession(defaultCaps);
      sessionId1.should.not.eql(sessionId2);
    });

    it('should get the current session', async function () {
      let [, caps] = await d.createSession(defaultCaps);
      caps.should.equal(await d.getSession());
    });

    it('should return sessions if no session exists', async function () {
      let sessions = await d.getSessions();
      sessions.length.should.equal(0);
    });

    it('should return sessions', async function () {
      let caps = _.clone(defaultCaps);
      caps.a = 'cap';
      await d.createSession(caps);
      let sessions = await d.getSessions();

      sessions.length.should.equal(1);
      sessions[0].should.eql({
        id: d.sessionId,
        capabilities: caps
      });
    });

    it('should fulfill an unexpected driver quit promise', async function () {
      // make a command that will wait a bit so we can crash while it's running
      d.getStatus = async function () {
        await B.delay(1000);
        return 'good status';
      }.bind(d);
      let cmdPromise = d.executeCommand('getStatus');
      await B.delay(10);
      const p = new B((resolve, reject) => {
        setTimeout(() => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')), 5000);
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await cmdPromise.should.be.rejectedWith(/We crashed/);
      await p;
    });

    it('should not allow commands in middle of unexpected shutdown', async function () {
      // make a command that will wait a bit so we can crash while it's running
      d.oldDeleteSession = d.deleteSession;
      d.deleteSession = async function () {
        await B.delay(100);
        await this.oldDeleteSession();
      }.bind(d);
      let caps = _.clone(defaultCaps);
      await d.createSession(caps);
      const p = new B((resolve, reject) => {
        setTimeout(() => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')), 5000);
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await p;
      await d.executeCommand('getSession').should.be.rejectedWith(/shut down/);
    });

    it('should allow new commands after done shutting down', async function () {
      // make a command that will wait a bit so we can crash while it's running
      d.oldDeleteSession = d.deleteSession;
      d.deleteSession = async function () {
        await B.delay(100);
        await this.oldDeleteSession();
      }.bind(d);

      let caps = _.clone(defaultCaps);
      await d.createSession(caps);
      const p = new B((resolve, reject) => {
        setTimeout(() => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')), 5000);
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await p;

      await d.executeCommand('getSession').should.be.rejectedWith(/shut down/);
      await B.delay(500);

      await d.executeCommand('createSession', caps);
      await d.deleteSession();
    });

    it('should distinguish between W3C and JSONWP session', async function () {
      // Test JSONWP
      await d.executeCommand('createSession', Object.assign({}, defaultCaps, {
        platformName: 'Fake',
        deviceName: 'Commodore 64',
      }));

      d.protocol.should.equal('MJSONWP');
      await d.executeCommand('deleteSession');

      // Test W3C (leave first 2 args null because those are the JSONWP args)
      await d.executeCommand('createSession', null, null, {
        alwaysMatch: Object.assign({}, defaultCaps, {
          platformName: 'Fake',
          deviceName: 'Commodore 64',
        }),
        firstMatch: [{}],
      });

      d.protocol.should.equal('W3C');
    });

    describe('protocol detection', function () {
      it('should use MJSONWP if only JSONWP caps are provided', async function () {
        await d.createSession(defaultCaps);
        d.protocol.should.equal('MJSONWP');
      });

      it('should use W3C if only W3C caps are provided', async function () {
        await d.createSession(null, null, {alwaysMatch: defaultCaps, firstMatch: [{}]});
        d.protocol.should.equal('W3C');
      });
    });

    it('should have a method to get driver for a session', async function () {
      let [sessId] = await d.createSession(defaultCaps);
      d.driverForSession(sessId).should.eql(d);
    });

    describe('command queue', function () {
      let d = new DriverClass();

      let waitMs = 10;
      d.getStatus = async function () {
        await B.delay(waitMs);
        return Date.now();
      }.bind(d);

      d.getSessions = async function () {
        await B.delay(waitMs);
        throw new Error('multipass');
      }.bind(d);

      afterEach(function () {
        d.clearNewCommandTimeout();
      });

      it('should queue commands and.executeCommand/respond in the order received', async function () {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        let results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error('Got result out of order');
          }
        }
      });

      it('should handle errors correctly when queuing', async function () {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          if (i === 5) {
            cmds.push(d.executeCommand('getSessions'));
          } else {
            cmds.push(d.executeCommand('getStatus'));
          }
        }
        let results = await B.settle(cmds);
        for (let i = 1; i < 5; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error('Got result out of order');
          }
        }
        results[5].reason().message.should.contain('multipass');
        for (let i = 7; i < numCmds; i++) {
          if (results[i].value() <= results[i - 1].value()) {
            throw new Error('Got result out of order');
          }
        }
      });

      it('should not care if queue empties for a bit', async function () {
        let numCmds = 10;
        let cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        let results = await B.all(cmds);
        cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        results = await B.all(cmds);
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error('Got result out of order');
          }
        }
      });
    });

    describe('timeouts', function () {
      before(async function () {
        await d.createSession(defaultCaps);
      });
      describe('command', function () {
        it('should exist by default', function () {
          d.newCommandTimeoutMs.should.equal(60000);
        });
        it('should be settable through `timeouts`', async function () {
          await d.timeouts('command', 20);
          d.newCommandTimeoutMs.should.equal(20);
        });
      });
      describe('implicit', function () {
        it('should not exist by default', function () {
          d.implicitWaitMs.should.equal(0);
        });
        it('should be settable through `timeouts`', async function () {
          await d.timeouts('implicit', 20);
          d.implicitWaitMs.should.equal(20);
        });
      });
    });

    describe('timeouts (W3C)', function () {
      beforeEach(async function () {
        await d.createSession(null, null, w3cCaps);
      });
      afterEach(async function () {
        await d.deleteSession();
      });
      it('should get timeouts that we set', async function () {
        await d.timeouts(undefined, undefined, undefined, undefined, 1000);
        await d.getTimeouts().should.eventually.have.property('implicit', 1000);
        await d.timeouts('command', 2000);
        await d.getTimeouts().should.eventually.deep.equal({
          implicit: 1000,
          command: 2000,
        });
        await d.timeouts(undefined, undefined, undefined, undefined, 3000);
        await d.getTimeouts().should.eventually.deep.equal({
          implicit: 3000,
          command: 2000,
        });
      });
    });

    describe('reset compatibility', function () {
      it('should not allow both fullReset and noReset to be true', async function () {
        let newCaps = Object.assign({}, defaultCaps, {
          fullReset: true,
          noReset: true
        });
        await d.createSession(newCaps).should.eventually.be.rejectedWith(
            /noReset.+fullReset/);
      });
    });

    describe('proxying', function () {
      let sessId;
      beforeEach(async function () {
        [sessId] = await d.createSession(defaultCaps);
      });
      describe('#proxyActive', function () {
        it('should exist', function () {
          d.proxyActive.should.be.an.instanceof(Function);
        });
        it('should return false', function () {
          d.proxyActive(sessId).should.be.false;
        });
        it('should throw an error when sessionId is wrong', function () {
          (() => { d.proxyActive('aaa'); }).should.throw;
        });
      });

      describe('#getProxyAvoidList', function () {
        it('should exist', function () {
          d.getProxyAvoidList.should.be.an.instanceof(Function);
        });
        it('should return an array', function () {
          d.getProxyAvoidList(sessId).should.be.an.instanceof(Array);
        });
        it('should throw an error when sessionId is wrong', function () {
          (() => { d.getProxyAvoidList('aaa'); }).should.throw;
        });
      });

      describe('#canProxy', function () {
        it('should have a #canProxy method', function () {
          d.canProxy.should.be.an.instanceof(Function);
        });
        it('should return false from #canProxy', function () {
          d.canProxy(sessId).should.be.false;
        });
        it('should throw an error when sessionId is wrong', function () {
          (() => { d.canProxy(); }).should.throw;
        });
      });

      describe('#proxyRouteIsAvoided', function () {
        it('should validate form of avoidance list', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /\/foo/], ['GET']]);
          (() => { d.proxyRouteIsAvoided(); }).should.throw;
          avoidStub.returns([['POST', /\/foo/], ['GET', /^foo/, 'bar']]);
          (() => { d.proxyRouteIsAvoided(); }).should.throw;
          avoidStub.restore();
        });
        it('should reject bad http methods', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^foo/], ['BAZETE', /^bar/]]);
          (() => { d.proxyRouteIsAvoided(); }).should.throw;
          avoidStub.restore();
        });
        it('should reject non-regex routes', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^foo/], ['GET', '/bar']]);
          (() => { d.proxyRouteIsAvoided(); }).should.throw;
          avoidStub.restore();
        });
        it('should return true for routes in the avoid list', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          d.proxyRouteIsAvoided(null, 'POST', '/foo/bar').should.be.true;
          avoidStub.restore();
        });
        it('should strip away any wd/hub prefix', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          d.proxyRouteIsAvoided(null, 'POST', '/wd/hub/foo/bar').should.be.true;
          avoidStub.restore();
        });
        it('should return false for routes not in the avoid list', function () {
          const avoidStub = sinon.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          d.proxyRouteIsAvoided(null, 'GET', '/foo/bar').should.be.false;
          d.proxyRouteIsAvoided(null, 'POST', '/boo').should.be.false;
          avoidStub.restore();
        });
      });
    });

    describe('event timing framework', function () {
      let beforeStartTime;
      beforeEach(async function () {
        beforeStartTime = Date.now();
        d.shouldValidateCaps = false;
        await d.executeCommand('createSession', defaultCaps);
      });
      describe('#eventHistory', function () {
        it('should have an eventHistory property', function () {
          should.exist(d.eventHistory);
          should.exist(d.eventHistory.commands);
        });

        it('should have a session start timing after session start', function () {
          let {newSessionRequested, newSessionStarted} = d.eventHistory;
          newSessionRequested.should.have.length(1);
          newSessionStarted.should.have.length(1);
          newSessionRequested[0].should.be.a('number');
          newSessionStarted[0].should.be.a('number');
          (newSessionRequested[0] >= beforeStartTime).should.be.true;
          (newSessionStarted[0] >= newSessionRequested[0]).should.be.true;
        });

        it('should include a commands list', async function () {
          await d.executeCommand('getStatus', []);
          d.eventHistory.commands.length.should.equal(2);
          d.eventHistory.commands[1].cmd.should.equal('getStatus');
          d.eventHistory.commands[1].startTime.should.be.a('number');
          d.eventHistory.commands[1].endTime.should.be.a('number');
        });
      });
      describe('#logEvent', function () {
        it('should allow logging arbitrary events', function () {
          d.logEvent('foo');
          d.eventHistory.foo[0].should.be.a('number');
          (d.eventHistory.foo[0] >= beforeStartTime).should.be.true;
        });
        it('should not allow reserved or oddly formed event names', function () {
          (() => {
            d.logEvent('commands');
          }).should.throw();
          (() => {
            d.logEvent(1);
          }).should.throw();
          (() => {
            d.logEvent({});
          }).should.throw();
        });
      });
      it('should allow logging the same event multiple times', function () {
        d.logEvent('bar');
        d.logEvent('bar');
        d.eventHistory.bar.should.have.length(2);
        d.eventHistory.bar[1].should.be.a('number');
        (d.eventHistory.bar[1] >= d.eventHistory.bar[0]).should.be.true;
      });
      describe('getSession decoration', function () {
        it('should decorate getSession response if opt-in cap is provided', async function () {
          let res = await d.getSession();
          should.not.exist(res.events);

          d.caps.eventTimings = true;
          res = await d.getSession();
          should.exist(res.events);
          should.exist(res.events.newSessionRequested);
          res.events.newSessionRequested[0].should.be.a('number');
        });
      });
    });
    describe('.reset', function () {
      it('should reset as W3C if the original session was W3C', async function () {
        const caps = {
          alwaysMatch: Object.assign({}, {
            app: 'Fake',
            deviceName: 'Fake',
            automationName: 'Fake',
            platformName: 'Fake',
          }, defaultCaps),
          firstMatch: [{}],
        };
        await d.createSession(undefined, undefined, caps);
        d.protocol.should.equal('W3C');
        await d.reset();
        d.protocol.should.equal('W3C');
      });
      it('should reset as MJSONWP if the original session was MJSONWP', async function () {
        const caps = Object.assign({}, {
          app: 'Fake',
          deviceName: 'Fake',
          automationName: 'Fake',
          platformName: 'Fake',
        }, defaultCaps);
        await d.createSession(caps);
        d.protocol.should.equal('MJSONWP');
        await d.reset();
        d.protocol.should.equal('MJSONWP');
      });
    });
  });

  describe('DeviceSettings', function () {
    it('should not hold on to reference of defaults in constructor', function () {
      let obj = {foo: 'bar'};
      let d1 = new DeviceSettings(obj);
      let d2 = new DeviceSettings(obj);
      d1._settings.foo = 'baz';
      d1._settings.should.not.eql(d2._settings);
    });
  });

  describe('.isFeatureEnabled', function () {
    const d = new DriverClass();

    afterEach(function () {
      d.denyInsecure = null;
      d.allowInsecure = null;
      d.relaxedSecurityEnabled = null;
    });

    it('should say a feature is enabled when it is explicitly allowed', function () {
      d.allowInsecure = ['foo', 'bar'];
      d.isFeatureEnabled('foo').should.be.true;
      d.isFeatureEnabled('bar').should.be.true;
      d.isFeatureEnabled('baz').should.be.false;
    });

    it('should say a feature is not enabled if it is not enabled', function () {
      d.allowInsecure = [];
      d.isFeatureEnabled('foo').should.be.false;
    });

    it('should prefer denyInsecure to allowInsecure', function () {
      d.allowInsecure = ['foo', 'bar'];
      d.denyInsecure = ['foo'];
      d.isFeatureEnabled('foo').should.be.false;
      d.isFeatureEnabled('bar').should.be.true;
      d.isFeatureEnabled('baz').should.be.false;
    });

    it('should allow global setting for insecurity', function () {
      d.relaxedSecurityEnabled = true;
      d.isFeatureEnabled('foo').should.be.true;
      d.isFeatureEnabled('bar').should.be.true;
      d.isFeatureEnabled('baz').should.be.true;
    });

    it('global setting should be overrideable', function () {
      d.relaxedSecurityEnabled = true;
      d.denyInsecure = ['foo', 'bar'];
      d.isFeatureEnabled('foo').should.be.false;
      d.isFeatureEnabled('bar').should.be.false;
      d.isFeatureEnabled('baz').should.be.true;
    });
  });
}

export default baseDriverUnitTests;
