import _ from 'lodash';
import B from 'bluebird';
// eslint-disable-next-line import/named
import {createSandbox} from 'sinon';

// wrap these tests in a function so we can export the tests and re-use them
// for actual driver implementations

/**
 * Creates unit test suites for a driver.
 * @template {Constraints} C
 * @param {DriverClass<C>} DriverClass
 * @param {import('@appium/types').NSDriverCaps<C>} [defaultCaps]
 */

export function driverUnitTestSuite(
  DriverClass,
  defaultCaps = /** @type {import('@appium/types').NSDriverCaps<C>} */ ({})
) {
  // to display the driver under test in report
  const className = DriverClass.name ?? '(unknown driver)';

  describe(`BaseDriver unit suite (as ${className})`, function () {
    /** @type {InstanceType<typeof DriverClass>} */
    let d;
    /** @type {import('@appium/types').W3CDriverCaps<C>} */
    let w3cCaps;
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;
    let expect;
    let should;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      chai.use(chaiAsPromised.default);
      expect = chai.expect;
      should = chai.should();
    });

    beforeEach(function () {
      sandbox = createSandbox();
      d = new DriverClass();
      w3cCaps = {
        alwaysMatch: {
          ...defaultCaps,
          platformName: 'Fake',
          'appium:deviceName': 'Commodore 64',
        },
        firstMatch: [{}],
      };
    });
    afterEach(async function () {
      sandbox?.restore();
      await d?.deleteSession();
    });

    describe('static property', function () {
      describe('baseVersion', function () {
        it('should exist', function () {
          expect(DriverClass.baseVersion).to.exist;
        });
      });
    });

    it('should return an empty status object', async function () {
      let status = await d.getStatus();
      status.should.eql({});
    });

    it('should return a sessionId from createSession', async function () {
      let [sessId] = await d.createSession(w3cCaps);
      should.exist(sessId);
      expect(sessId).to.be.a('string');
      expect(sessId.length).to.be.above(5);
    });

    it('should not be able to start two sessions without closing the first', async function () {
      await d.createSession(_.cloneDeep(w3cCaps));
      await expect(d.createSession(_.cloneDeep(w3cCaps))).to.be.rejectedWith('session');
    });

    it('should be able to delete a session', async function () {
      let sessionId1 = await d.createSession(_.cloneDeep(w3cCaps));
      await d.deleteSession();
      should.equal(d.sessionId, null);
      let sessionId2 = await d.createSession(_.cloneDeep(w3cCaps));
      expect(sessionId1).to.not.eql(sessionId2);
    });

    it('should get the current session', async function () {
      let [, caps] = await d.createSession(w3cCaps);
      expect(caps).to.equal(await d.getSession());
    });

    it('should fulfill an unexpected driver quit promise', async function () {
      // make a command that will wait a bit so we can crash while it's running
      sandbox.stub(d, 'getStatus').callsFake(async () => {
        await B.delay(1000);
        return 'good status';
      });
      let cmdPromise = d.executeCommand('getStatus');
      await B.delay(10);
      const p = new B((resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'onUnexpectedShutdown event is expected to be fired within 5 seconds timeout'
              )
            ),
          5000
        );
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await expect(cmdPromise).to.be.rejectedWith(/We crashed/);
      await p;
    });

    it('should not allow commands in middle of unexpected shutdown', async function () {
      // make a command that will wait a bit so we can crash while it's running
      sandbox.stub(d, 'deleteSession').callsFake(async function () {
        await B.delay(100);
        DriverClass.prototype.deleteSession.call(this);
      });
      await d.createSession(w3cCaps);
      const p = new B((resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'onUnexpectedShutdown event is expected to be fired within 5 seconds timeout'
              )
            ),
          5000
        );
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await p;
      await expect(d.executeCommand('getSession')).to.be.rejectedWith(/shut down/);
    });

    it('should allow new commands after done shutting down', async function () {
      // make a command that will wait a bit so we can crash while it's running
      sandbox.stub(d, 'deleteSession').callsFake(async function () {
        await B.delay(100);
        DriverClass.prototype.deleteSession.call(this);
      });

      await d.createSession(_.cloneDeep(w3cCaps));
      const p = new B((resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'onUnexpectedShutdown event is expected to be fired within 5 seconds timeout'
              )
            ),
          5000
        );
        d.onUnexpectedShutdown(resolve);
      });
      d.startUnexpectedShutdown(new Error('We crashed'));
      await p;

      await expect(d.executeCommand('getSession')).to.be.rejectedWith(/shut down/);
      await B.delay(500);

      await d.executeCommand('createSession', null, null, _.cloneDeep(w3cCaps));
      await d.deleteSession();
    });

    it('should distinguish between W3C and JSONWP session', async function () {
      // Test W3C (leave first 2 args null because those are the JSONWP args)
      await d.executeCommand('createSession', null, null, {
        alwaysMatch: {
          ...defaultCaps,
          platformName: 'Fake',
          'appium:deviceName': 'Commodore 64',
        },
        firstMatch: [{}],
      });

      expect(d.protocol).to.equal('W3C');
    });

    describe('protocol detection', function () {
      it('should use W3C if only W3C caps are provided', async function () {
        await d.createSession({
          alwaysMatch: _.clone(defaultCaps),
          firstMatch: [{}],
        });
        expect(d.protocol).to.equal('W3C');
      });
    });

    it('should have a method to get driver for a session', async function () {
      let [sessId] = await d.createSession(w3cCaps);
      expect(d.driverForSession(sessId)).to.eql(d);
    });

    describe('command queue', function () {
      /** @type {InstanceType<DriverClass<Constraints>>} */
      let d;
      let waitMs = 10;

      beforeEach(function () {
        d = new DriverClass();
        sandbox.stub(d, 'getStatus').callsFake(async () => {
          await B.delay(waitMs);
          return Date.now();
        });
        sandbox.stub(d, 'deleteSession').callsFake(async () => {
          await B.delay(waitMs);
          throw new Error('multipass');
        });
      });

      afterEach(async function () {
        await d.clearNewCommandTimeout();
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
            cmds.push(d.executeCommand('deleteSession'));
          } else {
            cmds.push(d.executeCommand('getStatus'));
          }
        }
        let results = /** @type {PromiseFulfilledResult<any>[]} */ (

          await Promise.allSettled(cmds)
        );
        for (let i = 1; i < 5; i++) {
          if (results[i].value <= results[i - 1].value) {
            throw new Error('Got result out of order');
          }
        }
        /** @type {PromiseRejectedResult} */ (
          /** @type {unknown} */ (results[5])
        ).reason.message.should.contain('multipass');
        for (let i = 7; i < numCmds; i++) {
          if (results[i].value <= results[i - 1].value) {
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
        await d.createSession(w3cCaps);
      });
      describe('command', function () {
        it('should exist by default', function () {
          expect(d.newCommandTimeoutMs).to.equal(60000);
        });
        it('should be settable through `timeouts`', async function () {
          await d.timeouts('command', 20);
          expect(d.newCommandTimeoutMs).to.equal(20);
        });
      });
      describe('implicit', function () {
        it('should not exist by default', function () {
          expect(d.implicitWaitMs).to.equal(0);
        });
        it('should be settable through `timeouts`', async function () {
          await d.timeouts('implicit', 20);
          expect(d.implicitWaitMs).to.equal(20);
        });
      });
    });

    describe('timeouts (W3C)', function () {
      beforeEach(async function () {
        await d.createSession(w3cCaps);
      });
      afterEach(async function () {
        await d.deleteSession();
      });
      it('should get timeouts that we set', async function () {
        await d.timeouts(undefined, undefined, undefined, undefined, 1000);
        await expect(d.getTimeouts()).to.eventually.have.property('implicit', 1000);
        await d.timeouts('command', 2000);
        await expect(d.getTimeouts()).to.eventually.deep.equal({
          implicit: 1000,
          command: 2000,
        });
        await d.timeouts(undefined, undefined, undefined, undefined, 3000);
        await expect(d.getTimeouts()).to.eventually.deep.equal({
          implicit: 3000,
          command: 2000,
        });
      });
    });

    describe('reset compatibility', function () {
      it('should not allow both fullReset and noReset to be true', async function () {
        const newCaps = {
          alwaysMatch: {
            ...defaultCaps,
            platformName: 'Fake',
            'appium:deviceName': 'Commodore 64',
            'appium:fullReset': true,
            'appium:noReset': true,
          },
          firstMatch: [{}],
        };
        await expect(d.createSession(newCaps)).to.be.rejectedWith(/noReset.+fullReset/);
      });
    });

    describe('proxying', function () {
      let sessId;
      beforeEach(async function () {
        [sessId] = await d.createSession(w3cCaps);
      });
      describe('#proxyActive', function () {
        it('should exist', function () {
          expect(d.proxyActive).to.be.an.instanceof(Function);
        });
        it('should return false', function () {
          expect(d.proxyActive(sessId)).to.be.false;
        });
        it('should throw an error when sessionId is wrong', function () {
          expect(() => {
            d.proxyActive('aaa');
          }).to.throw;
        });
      });

      describe('#getProxyAvoidList', function () {
        it('should exist', function () {
          expect(d.getProxyAvoidList).to.be.an.instanceof(Function);
        });
        it('should return an array', function () {
          expect(d.getProxyAvoidList(sessId)).to.be.an.instanceof(Array);
        });
        it('should throw an error when sessionId is wrong', function () {
          expect(() => {
            d.getProxyAvoidList('aaa');
          }).to.throw;
        });
      });

      describe('#canProxy', function () {
        it('should have a #canProxy method', function () {
          expect(d.canProxy).to.be.an.instanceof(Function);
        });
        it('should return a boolean from #canProxy', function () {
          expect(d.canProxy(sessId)).to.be.a('boolean');
        });
        it('should throw an error when sessionId is wrong', function () {
          expect(() => {
            d.canProxy();
          }).to.throw;
        });
      });

      describe('#proxyRouteIsAvoided', function () {
        it('should validate form of avoidance list', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          // @ts-expect-error
          avoidStub.returns([['POST', /\/foo/], ['GET']]);
          expect(() => {
            // @ts-expect-error
            d.proxyRouteIsAvoided();
          }).to.throw;
          avoidStub.returns([
            ['POST', /\/foo/],
            // @ts-expect-error
            ['GET', /^foo/, 'bar'],
          ]);
          expect(() => {
            // @ts-expect-error
            d.proxyRouteIsAvoided();
          }).to.throw;
        });
        it('should reject bad http methods', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([
            ['POST', /^foo/],
            // @ts-expect-error
            ['BAZETE', /^bar/],
          ]);
          expect(() => {
            // @ts-expect-error
            d.proxyRouteIsAvoided();
          }).to.throw;
        });
        it('should reject non-regex routes', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([
            ['POST', /^foo/],
            // @ts-expect-error
            ['GET', '/bar'],
          ]);
          expect(() => {
            // @ts-expect-error
            d.proxyRouteIsAvoided();
          }).to.throw;
        });
        it('should return true for routes in the avoid list', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          expect(d.proxyRouteIsAvoided('foo', 'POST', '/foo/bar')).to.be.true;
        });
        it('should strip away any wd/hub prefix', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          expect(d.proxyRouteIsAvoided('foo', 'POST', '/foo/bar')).to.be.true;
        });
        it('should return false for routes not in the avoid list', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /^\/foo/]]);
          expect(d.proxyRouteIsAvoided('foo', 'GET', '/foo/bar')).to.be.false;
          expect(d.proxyRouteIsAvoided('foo', 'POST', '/boo')).to.be.false;
        });
      });
    });

    describe('event timing framework', function () {
      let beforeStartTime;
      beforeEach(async function () {
        beforeStartTime = Date.now();
        d.shouldValidateCaps = false;
        await d.executeCommand('createSession', null, null, {
          alwaysMatch: {...defaultCaps},
          firstMatch: [{}],
        });
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
          expect(newSessionRequested[0] >= beforeStartTime).to.be.true;
          expect(newSessionStarted[0] >= newSessionRequested[0]).to.be.true;
        });

        it('should include a commands list', async function () {
          await d.executeCommand('getStatus', []);
          expect(d.eventHistory.commands.length).to.equal(2);
          expect(d.eventHistory.commands[1].cmd).to.equal('getStatus');
          expect(d.eventHistory.commands[1].startTime).to.be.a('number');
          expect(d.eventHistory.commands[1].endTime).to.be.a('number');
        });
      });
      describe('#logEvent', function () {
        it('should allow logging arbitrary events', function () {
          d.logEvent('foo');
          expect(d.eventHistory.foo[0]).to.be.a('number');
          expect(d.eventHistory.foo[0] >= beforeStartTime).to.be.true;
        });
        it('should not allow reserved or oddly formed event names', function () {
          expect(() => {
            d.logEvent('commands');
          }).to.throw();
          expect(() => {
            // @ts-expect-error - bad type
            d.logEvent(1);
          }).to.throw();
          expect(() => {
            // @ts-expect-error - bad type
            d.logEvent({});
          }).to.throw();
        });
      });
      it('should allow logging the same event multiple times', function () {
        d.logEvent('bar');
        d.logEvent('bar');
        expect(d.eventHistory.bar).to.have.length(2);
        expect(d.eventHistory.bar[1]).to.be.a('number');
        expect(d.eventHistory.bar[1] >= d.eventHistory.bar[0]).to.be.true;
      });
      describe('getSession decoration', function () {
        it('should decorate getSession response if opt-in cap is provided', async function () {
          let res = await d.getSession();
          should.not.exist(res.events);

          _.set(d, 'caps.eventTimings', true);
          res = await d.getSession();
          should.exist(res.events);
          should.exist(res.events?.newSessionRequested);
          expect(res.events?.newSessionRequested[0]).to.be.a('number');
        });
      });
    });
  });

  describe('.isFeatureEnabled', function () {
    let d;
    let expect;

    before(async function () {
      const chai = await import('chai');
      expect = chai.expect;
    });

    beforeEach(function () {
      d = new DriverClass();
    });

    it('should throw if feature name is invalid', function () {
      expect(() => {
        d.allowInsecure = ['foo'];
        d.isFeatureEnabled('foo');
      }).to.throw();
    });

    it('should allow global setting for insecurity', function () {
      d.relaxedSecurityEnabled = true;
      expect(d.isFeatureEnabled('foo')).to.be.true;
      expect(d.isFeatureEnabled('bar')).to.be.true;
      expect(d.isFeatureEnabled('baz')).to.be.true;
    });

    it('global setting should be overrideable', function () {
      d.relaxedSecurityEnabled = true;
      d.denyInsecure = ['*:foo', '*:bar'];
      expect(d.isFeatureEnabled('foo')).to.be.false;
      expect(d.isFeatureEnabled('bar')).to.be.false;
      expect(d.isFeatureEnabled('baz')).to.be.true;
    });

    it('should say a feature is enabled if it is for this driver', function () {
      d.opts.automationName = 'bar';
      d.allowInsecure = ['bar:foo'];
      expect(d.isFeatureEnabled('foo')).to.be.true;
    });

    it('should say a feature is enabled if it is for all drivers', function () {
      d.opts.automationName = 'bar';
      d.allowInsecure = ['*:foo'];
      expect(d.isFeatureEnabled('foo')).to.be.true;
    });

    it('should say a feature is not enabled if it is not for this driver', function () {
      d.opts.automationName = 'bar';
      d.allowInsecure = ['baz:foo'];
      expect(d.isFeatureEnabled('foo')).to.be.false;
    });

    it('should say a feature is not enabled if it is enabled and then disabled', function () {
      d.opts.automationName = 'bar';
      d.allowInsecure = ['bar:foo'];
      d.denyInsecure = ['*:foo'];
      expect(d.isFeatureEnabled('foo')).to.be.false;
    });
  });
}

/**
 * @typedef {import('@appium/types').BaseNSCapabilities} BaseNSCapabilities
 * @typedef {import('@appium/types').Constraints} Constraints
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').DriverClass<Driver<C>>} DriverClass
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').Driver<C>} Driver
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').W3CCapabilities<C>} W3CCapabilities
 */
