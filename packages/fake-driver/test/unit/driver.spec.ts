import assert from 'node:assert/strict';
import {describe, it, before, beforeEach, afterEach} from 'node:test';

import type {Constraints, W3CDriverCaps} from '@appium/types';
import {sleep} from 'asyncbox';
import {createSandbox} from 'sinon';

import {FakeDriver} from '../../lib/index.js';
import {W3C_CAPS, W3C_PREFIXED_CAPS} from '../helpers.js';

describe('FakeDriver unit suite', function () {
  let d: FakeDriver;
  let w3cCaps: W3CDriverCaps<Constraints>;
  let sandbox: ReturnType<typeof createSandbox>;
  const defaultCaps = structuredClone(W3C_PREFIXED_CAPS);

  beforeEach(function () {
    sandbox = createSandbox();
    d = new FakeDriver();
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
        assert.ok(FakeDriver.baseVersion);
      });
    });
  });

  it('should return an empty status object', async function () {
    const status = await d.getStatus();
    assert.deepStrictEqual(status, {});
  });

  it('should return a sessionId from createSession', async function () {
    const [sessId] = await d.createSession(w3cCaps);
    assert.ok(sessId);
    assert.strictEqual(typeof sessId, 'string');
    assert.ok(sessId.length > 5);
  });

  it('should not be able to start two sessions without closing the first', async function () {
    await d.createSession(structuredClone(w3cCaps));
    await assert.rejects(d.createSession(structuredClone(w3cCaps)), /session/);
  });

  it('should be able to delete a session', async function () {
    const sessionId1 = await d.createSession(structuredClone(w3cCaps));
    await d.deleteSession();
    assert.strictEqual(d.sessionId, null);
    const sessionId2 = await d.createSession(structuredClone(w3cCaps));
    assert.notDeepStrictEqual(sessionId1, sessionId2);
  });

  it('should get the current session', async function () {
    const [, caps] = await d.createSession(w3cCaps);
    assert.strictEqual(caps, await d.getSession());
  });

  it('should fulfill an unexpected driver quit promise', async function () {
    sandbox.stub(d, 'getStatus').callsFake(async () => {
      await sleep(1000);
      return 'good status';
    });
    const cmdPromise = d.executeCommand('getStatus');
    await sleep(10);
    const p = new Promise<void>((resolve, reject) => {
      setTimeout(
        () => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')),
        5000,
      );
      d.onUnexpectedShutdown(resolve);
    });
    void d.startUnexpectedShutdown(new Error('We crashed'));
    await assert.rejects(cmdPromise, /We crashed/);
    await p;
  });

  it('should not allow commands in middle of unexpected shutdown', async function () {
    sandbox.stub(d, 'deleteSession').callsFake(async function (this: FakeDriver) {
      await sleep(100);
      await FakeDriver.prototype.deleteSession.call(this);
    });
    await d.createSession(w3cCaps);
    const p = new Promise<void>((resolve, reject) => {
      setTimeout(
        () => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')),
        5000,
      );
      d.onUnexpectedShutdown(resolve);
    });
    void d.startUnexpectedShutdown(new Error('We crashed'));
    await p;
    await assert.rejects(d.executeCommand('getSession'), /shut down/);
  });

  it('should allow new commands after done shutting down', async function () {
    sandbox.stub(d, 'deleteSession').callsFake(async function (this: FakeDriver) {
      await sleep(100);
      await FakeDriver.prototype.deleteSession.call(this);
    });

    await d.createSession(structuredClone(w3cCaps));
    const p = new Promise<void>((resolve, reject) => {
      setTimeout(
        () => reject(new Error('onUnexpectedShutdown event is expected to be fired within 5 seconds timeout')),
        5000,
      );
      d.onUnexpectedShutdown(resolve);
    });
    void d.startUnexpectedShutdown(new Error('We crashed'));
    await p;

    await assert.rejects(d.executeCommand('getSession'), /shut down/);
    await sleep(500);

    await d.executeCommand('createSession', null, null, structuredClone(w3cCaps));
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

    assert.strictEqual(d.protocol, 'W3C');
  });

  describe('protocol detection', function () {
    it('should use W3C if only W3C caps are provided', async function () {
      await d.createSession({
        alwaysMatch: {...defaultCaps} as object,
        firstMatch: [{}],
      });
      assert.strictEqual(d.protocol, 'W3C');
    });
  });

  it('should have a method to get driver for a session', async function () {
    const [sessId] = await d.createSession(w3cCaps);
    assert.deepStrictEqual(d.driverForSession(sessId), d);
  });

  describe('command queue', function () {
    let d: FakeDriver;
    const waitMs = 10;

    beforeEach(function () {
      d = new FakeDriver();
      sandbox.stub(d, 'getStatus').callsFake(async () => {
        await sleep(waitMs);
        return Date.now();
      });
      sandbox.stub(d, 'deleteSession').callsFake(async () => {
        await sleep(waitMs);
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
      const results = (await Promise.all(cmds)) as number[];
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
      assert.ok(rejected.reason.message.includes('multipass'));
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
      (await Promise.all(cmds)) as number[];
      cmds = [];
      for (let i = 0; i < numCmds; i++) {
        cmds.push(d.executeCommand('getStatus'));
      }
      const results = (await Promise.all(cmds)) as number[];
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
        assert.strictEqual(d.newCommandTimeoutMs, 60000);
      });
      it('should be settable through `timeouts`', async function () {
        await d.timeouts('command', 20);
        assert.strictEqual(d.newCommandTimeoutMs, 20);
      });
    });
    describe('implicit', function () {
      it('should not exist by default', function () {
        assert.strictEqual(d.implicitWaitMs, 0);
      });
      it('should be settable through `timeouts`', async function () {
        await d.timeouts('implicit', 20);
        assert.strictEqual(d.implicitWaitMs, 20);
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
      assert.strictEqual((await d.getTimeouts()).implicit, 1000);
      await d.timeouts('command', 2000);
      assert.deepStrictEqual(await d.getTimeouts(), {
        implicit: 1000,
        command: 2000,
      });
      await d.timeouts(undefined, undefined, undefined, undefined, 3000);
      assert.deepStrictEqual(await d.getTimeouts(), {
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
      await assert.rejects(d.createSession(newCaps), /noReset.+fullReset/);
    });
  });

  describe('proxying', function () {
    let sessId: string;
    beforeEach(async function () {
      [sessId] = await d.createSession(w3cCaps);
    });
    describe('#proxyActive', function () {
      it('should exist', function () {
        assert.ok(d.proxyActive instanceof Function);
      });
      it('should return false', function () {
        assert.strictEqual(d.proxyActive(sessId), false);
      });
    });

    describe('#getProxyAvoidList', function () {
      it('should exist', function () {
        assert.ok(d.getProxyAvoidList instanceof Function);
      });
      it('should return an array', function () {
        assert.ok(d.getProxyAvoidList(sessId) instanceof Array);
      });
    });

    describe('#canProxy', function () {
      it('should have a #canProxy method', function () {
        assert.ok(d.canProxy instanceof Function);
      });
      it('should return a boolean from #canProxy', function () {
        assert.strictEqual(typeof d.canProxy(sessId), 'boolean');
      });
    });

    describe('#proxyRouteIsAvoided', function () {
      it('should validate form of avoidance list', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([['POST', /\/foo/], ['GET']] as any);
        assert.throws(() => {
          (d as any).proxyRouteIsAvoided();
        });
        avoidStub.returns([
          ['POST', /\/foo/],
          ['GET', /^foo/, 'bar'],
        ] as any);
        assert.throws(() => {
          (d as any).proxyRouteIsAvoided();
        });
      });
      it('should reject bad http methods', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([
          ['POST', /^foo/],
          ['BAZETE' as any, /^bar/],
        ]);
        assert.throws(() => {
          (d as any).proxyRouteIsAvoided();
        });
      });
      it('should reject non-regex routes', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([
          ['POST', /^foo/],
          ['GET', '/bar' as any],
        ]);
        assert.throws(() => {
          (d as any).proxyRouteIsAvoided();
        });
      });
      it('should return true for routes in the avoid list', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([['POST', /^\/foo/]]);
        assert.strictEqual(d.proxyRouteIsAvoided('foo', 'POST', '/foo/bar'), true);
      });
      it('should strip away any wd/hub prefix', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([['POST', /^\/foo/]]);
        assert.strictEqual(d.proxyRouteIsAvoided('foo', 'POST', '/foo/bar'), true);
      });
      it('should return false for routes not in the avoid list', function () {
        const avoidStub = sandbox.stub(d, 'getProxyAvoidList');
        avoidStub.returns([['POST', /^\/foo/]]);
        assert.strictEqual(d.proxyRouteIsAvoided('foo', 'GET', '/foo/bar'), false);
        assert.strictEqual(d.proxyRouteIsAvoided('foo', 'POST', '/boo'), false);
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
        assert.ok(d.eventHistory);
        assert.ok(d.eventHistory.commands);
      });

      it('should have a session start timing after session start', function () {
        const {newSessionRequested, newSessionStarted} = d.eventHistory;
        assert.strictEqual(newSessionRequested.length, 1);
        assert.strictEqual(newSessionStarted.length, 1);
        assert.strictEqual(typeof newSessionRequested[0], 'number');
        assert.strictEqual(typeof newSessionStarted[0], 'number');
        assert.strictEqual(newSessionRequested[0] >= beforeStartTime, true);
        assert.strictEqual(newSessionStarted[0] >= newSessionRequested[0], true);
      });

      it('should include a commands list', async function () {
        await d.executeCommand('getStatus', []);
        assert.strictEqual(d.eventHistory.commands.length, 2);
        assert.strictEqual(d.eventHistory.commands[1].cmd, 'getStatus');
        assert.strictEqual(typeof d.eventHistory.commands[1].startTime, 'number');
        assert.strictEqual(typeof d.eventHistory.commands[1].endTime, 'number');
      });
    });
    describe('#logEvent', function () {
      it('should allow logging arbitrary events', function () {
        d.logEvent('foo');
        assert.strictEqual(typeof d.eventHistory.foo[0], 'number');
        assert.strictEqual(d.eventHistory.foo[0] >= beforeStartTime, true);
      });
      it('should not allow reserved or oddly formed event names', function () {
        assert.throws(() => {
          d.logEvent('commands');
        });
        assert.throws(() => {
          d.logEvent(1 as any);
        });
        assert.throws(() => {
          d.logEvent({} as any);
        });
      });
    });
    it('should allow logging the same event multiple times', function () {
      d.logEvent('bar');
      d.logEvent('bar');
      assert.strictEqual(d.eventHistory.bar.length, 2);
      assert.strictEqual(typeof d.eventHistory.bar[1], 'number');
      assert.strictEqual(d.eventHistory.bar[1] >= d.eventHistory.bar[0], true);
    });
    describe('getSession decoration', function () {
      it('should decorate getSession response if opt-in cap is provided', async function () {
        let res = await d.getSession();
        assert.ok(!res.events);

        (d.caps as Record<string, unknown>).eventTimings = true;
        res = await d.getSession();
        assert.ok(res.events);
        assert.ok(res.events?.newSessionRequested);
        assert.strictEqual(typeof res.events?.newSessionRequested[0], 'number');
      });
    });
  });
});

describe('.isFeatureEnabled', function () {
  let d: FakeDriver;

  beforeEach(function () {
    d = new FakeDriver();
  });

  it('should throw if feature name is invalid', function () {
    assert.throws(() => {
      d.allowInsecure = ['foo'];
      d.isFeatureEnabled('foo');
    });
  });

  it('should allow global setting for insecurity', function () {
    d.relaxedSecurityEnabled = true;
    assert.strictEqual(d.isFeatureEnabled('foo'), true);
    assert.strictEqual(d.isFeatureEnabled('bar'), true);
    assert.strictEqual(d.isFeatureEnabled('baz'), true);
  });

  it('global setting should be overrideable', function () {
    d.relaxedSecurityEnabled = true;
    d.denyInsecure = ['*:foo', '*:bar'];
    assert.strictEqual(d.isFeatureEnabled('foo'), false);
    assert.strictEqual(d.isFeatureEnabled('bar'), false);
    assert.strictEqual(d.isFeatureEnabled('baz'), true);
  });

  it('should say a feature is enabled if it is for this driver', function () {
    d.opts.automationName = 'bar';
    d.allowInsecure = ['bar:foo'];
    assert.strictEqual(d.isFeatureEnabled('foo'), true);
  });

  it('should say a feature is enabled if it is for all drivers', function () {
    d.opts.automationName = 'bar';
    d.allowInsecure = ['*:foo'];
    assert.strictEqual(d.isFeatureEnabled('foo'), true);
  });

  it('should say a feature is not enabled if it is not for this driver', function () {
    d.opts.automationName = 'bar';
    d.allowInsecure = ['baz:foo'];
    assert.strictEqual(d.isFeatureEnabled('foo'), false);
  });

  it('should say a feature is not enabled if it is enabled and then disabled', function () {
    d.opts.automationName = 'bar';
    d.allowInsecure = ['bar:foo'];
    d.denyInsecure = ['*:foo'];
    assert.strictEqual(d.isFeatureEnabled('foo'), false);
  });
});

describe('FakeDriver', function () {
  it('should not start a session when a unique session is already running', async function () {
    const d1 = new FakeDriver();
    const [uniqueSession] = await d1.createSession(null as any, null as any, {
      alwaysMatch: {
        ...structuredClone(W3C_PREFIXED_CAPS),
        'appium:uniqueApp': true,
      },
      firstMatch: [{}],
    });
    assert.strictEqual(typeof uniqueSession, 'string');
    const d2 = new FakeDriver();
    const otherSessionData = [d1.driverData];
    try {
      await assert.rejects(
        d2.createSession(null as any, null as any, structuredClone(W3C_CAPS), otherSessionData),
        /unique/,
      );
    } finally {
      await d1.deleteSession(uniqueSession);
    }
  });
  it('should start a new session when another non-unique session is running', async function () {
    const d1 = new FakeDriver();
    const [session1Id] = await d1.createSession(null as any, null as any, structuredClone(W3C_CAPS));
    assert.strictEqual(typeof session1Id, 'string');
    const d2 = new FakeDriver();
    const [session2Id] = await d2.createSession(null as any, null as any, structuredClone(W3C_CAPS));
    assert.strictEqual(typeof session2Id, 'string');
    assert.notStrictEqual(session1Id, session2Id);
    await d1.deleteSession(session1Id);
    await d2.deleteSession(session2Id);
  });
});
