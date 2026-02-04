import _ from 'lodash';
import B from 'bluebird';
import {createSandbox} from 'sinon';
import type {
  Constraints,
  Driver,
  DriverClass,
  NSDriverCaps,
  W3CDriverCaps,
} from '@appium/types';

/**
 * Creates unit test suites for a driver.
 */
export function driverUnitTestSuite<C extends Constraints>(
  DriverClass: DriverClass<Driver<C>>,
  defaultCaps: NSDriverCaps<C> = {} as NSDriverCaps<C>
): void {
  const className = DriverClass.name ?? '(unknown driver)';

  describe(`BaseDriver unit suite (as ${className})`, function () {
    let d: InstanceType<typeof DriverClass>;
    let w3cCaps: W3CDriverCaps<C>;
    let sandbox: ReturnType<typeof createSandbox>;
    let expect: Chai.ExpectStatic;

    before(async function () {
      const chai = await import('chai');
      const chaiAsPromised = await import('chai-as-promised');
      (chai as any).use((chaiAsPromised as any).default);
      expect = (chai as any).expect;
      (chai as any).should(); // for client code that may use should style
    });

    beforeEach(function () {
      sandbox = createSandbox();
      d = new DriverClass() as InstanceType<typeof DriverClass>;
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
      const status = await d.getStatus();
      expect(status).to.eql({});
    });

    it('should return a sessionId from createSession', async function () {
      const [sessId] = await d.createSession(w3cCaps);
      expect(sessId).to.exist;
      expect(sessId).to.be.a('string');
      expect(sessId.length).to.be.above(5);
    });

    it('should not be able to start two sessions without closing the first', async function () {
      await d.createSession(_.cloneDeep(w3cCaps));
      await expect(d.createSession(_.cloneDeep(w3cCaps))).to.be.rejectedWith('session');
    });

    it('should be able to delete a session', async function () {
      const sessionId1 = await d.createSession(_.cloneDeep(w3cCaps));
      await d.deleteSession();
      expect(d.sessionId).to.equal(null);
      const sessionId2 = await d.createSession(_.cloneDeep(w3cCaps));
      expect(sessionId1).to.not.eql(sessionId2);
    });

    it('should get the current session', async function () {
      const [, caps] = await d.createSession(w3cCaps);
      expect(caps).to.equal(await d.getSession());
    });

    it('should fulfill an unexpected driver quit promise', async function () {
      sandbox.stub(d, 'getStatus').callsFake(async () => {
        await B.delay(1000);
        return 'good status';
      });
      const cmdPromise = d.executeCommand('getStatus');
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
      sandbox.stub(d, 'deleteSession').callsFake(async function (this: InstanceType<typeof DriverClass>) {
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
      sandbox.stub(d, 'deleteSession').callsFake(async function (this: InstanceType<typeof DriverClass>) {
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
          alwaysMatch: _.clone(defaultCaps) as object,
          firstMatch: [{}],
        });
        expect(d.protocol).to.equal('W3C');
      });
    });

    it('should have a method to get driver for a session', async function () {
      const [sessId] = await d.createSession(w3cCaps);
      expect(d.driverForSession(sessId)).to.eql(d);
    });

    describe('command queue', function () {
      let d: InstanceType<typeof DriverClass>;
      const waitMs = 10;

      beforeEach(function () {
        d = new DriverClass() as InstanceType<typeof DriverClass>;
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
        const numCmds = 10;
        const cmds: Promise<number>[] = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        const results = await B.all(cmds) as number[];
        for (let i = 1; i < numCmds; i++) {
          if (results[i] <= results[i - 1]) {
            throw new Error('Got result out of order');
          }
        }
      });

      it('should handle errors correctly when queuing', async function () {
        const numCmds = 10;
        const cmds: Promise<number | void>[] = [];
        for (let i = 0; i < numCmds; i++) {
          if (i === 5) {
            cmds.push(d.executeCommand('deleteSession'));
          } else {
            cmds.push(d.executeCommand('getStatus'));
          }
        }
        const results = await Promise.allSettled(cmds);
        for (let i = 1; i < 5; i++) {
          const r = results[i];
          const rPrev = results[i - 1];
          if (r.status === 'fulfilled' && rPrev.status === 'fulfilled') {
            if (r.value <= rPrev.value) {
              throw new Error('Got result out of order');
            }
          }
        }
        const rejected = results[5] as PromiseRejectedResult;
        expect(rejected.reason.message).to.contain('multipass');
        for (let i = 7; i < numCmds; i++) {
          const r = results[i];
          const rPrev = results[i - 1];
          if (r.status === 'fulfilled' && rPrev.status === 'fulfilled') {
            if (r.value <= rPrev.value) {
              throw new Error('Got result out of order');
            }
          }
        }
      });

      it('should not care if queue empties for a bit', async function () {
        const numCmds = 10;
        let cmds: Promise<number>[] = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        let results = await B.all(cmds) as number[];
        cmds = [];
        for (let i = 0; i < numCmds; i++) {
          cmds.push(d.executeCommand('getStatus'));
        }
        results = await B.all(cmds) as number[];
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
      let sessId: string;
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
            d.canProxy(undefined as any);
          }).to.throw;
        });
      });

      describe('#proxyRouteIsAvoided', function () {
        it('should validate form of avoidance list', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([['POST', /\/foo/], ['GET']] as any);
          expect(() => {
            (d as any).proxyRouteIsAvoided();
          }).to.throw;
          avoidStub.returns([
            ['POST', /\/foo/],
            ['GET', /^foo/, 'bar'],
          ] as any);
          expect(() => {
            (d as any).proxyRouteIsAvoided();
          }).to.throw;
        });
        it('should reject bad http methods', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([
            ['POST', /^foo/],
            ['BAZETE' as any, /^bar/],
          ]);
          expect(() => {
            (d as any).proxyRouteIsAvoided();
          }).to.throw;
        });
        it('should reject non-regex routes', function () {
          const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
          avoidStub.returns([
            ['POST', /^foo/],
            ['GET', '/bar' as any],
          ]);
          expect(() => {
            (d as any).proxyRouteIsAvoided();
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
      let beforeStartTime: number;
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
          expect(d.eventHistory).to.exist;
          expect(d.eventHistory.commands).to.exist;
        });

        it('should have a session start timing after session start', function () {
          const {newSessionRequested, newSessionStarted} = d.eventHistory;
          expect(newSessionRequested).to.have.length(1);
          expect(newSessionStarted).to.have.length(1);
          expect(newSessionRequested[0]).to.be.a('number');
          expect(newSessionStarted[0]).to.be.a('number');
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
            d.logEvent(1 as any);
          }).to.throw();
          expect(() => {
            d.logEvent({} as any);
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
          expect(res.events).to.not.exist;

          _.set(d, 'caps.eventTimings', true);
          res = await d.getSession();
          expect(res.events).to.exist;
          expect(res.events?.newSessionRequested).to.exist;
          expect(res.events?.newSessionRequested[0]).to.be.a('number');
        });
      });
    });
  });

  describe('.isFeatureEnabled', function () {
    let d: InstanceType<typeof DriverClass>;
    let expect: Chai.ExpectStatic;

    before(async function () {
      const chai = await import('chai');
      expect = (chai as any).expect;
      (chai as any).should(); // for client code that may use should style
    });

    beforeEach(function () {
      d = new DriverClass() as InstanceType<typeof DriverClass>;
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
