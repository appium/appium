import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import type {ExternalDriver, StringRecord} from '@appium/types';
import sinon from 'sinon';
import {WebSocket, WebSocketServer} from 'ws';

import {AppiumDriver} from '../../../lib/appium.js';
import {BidiProxyBridge} from '../../../lib/bidi/proxy.js';
import {BIDI_EVENT_NAME} from '../../../lib/constants.js';

interface JsonQueue {
  next: () => Promise<StringRecord>;
  pendingCount: () => number;
}

class ProxyTestDriver extends BaseDriver<any> {
  proxyUrl: string | null = null;

  override get bidiProxyUrl(): string | null {
    return this.proxyUrl;
  }
}

function createJsonQueue(socket: WebSocket): JsonQueue {
  const buffered: StringRecord[] = [];
  const waiters: Array<(msg: StringRecord) => void> = [];

  socket.on('message', (data) => {
    const parsed = JSON.parse(data.toString()) as StringRecord;
    const waiter = waiters.shift();
    if (waiter) {
      waiter(parsed);
    } else {
      buffered.push(parsed);
    }
  });

  return {
    next: () => {
      const queued = buffered.shift();
      if (queued) {
        return Promise.resolve(queued);
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    pendingCount: () => buffered.length,
  };
}

async function listen(server: WebSocketServer): Promise<number> {
  await new Promise<void>((resolve) => server.once('listening', resolve));
  return (server.address() as AddressInfo).port;
}

async function sendAndReceive(client: WebSocket, queue: JsonQueue, payload: StringRecord): Promise<StringRecord> {
  client.send(JSON.stringify(payload));
  return await queue.next();
}

async function roundTripSentinel(
  client: WebSocket,
  clientQueue: JsonQueue,
  upstreamSocket: WebSocket,
  upstreamQueue: JsonQueue,
  id: number,
): Promise<void> {
  const pending = sendAndReceive(client, clientQueue, {id, method: 'session.status', params: {}});
  const upReq = await upstreamQueue.next();
  assert.equal(upReq.method, 'session.status');
  upstreamSocket.send(JSON.stringify({id: upReq.id, type: 'success', result: {ready: true}}));
  const clientRes = await pending;
  assert.deepEqual(clientRes, {id, type: 'success', result: {ready: true}});
}

describe('BiDi proxied local event subscriptions', function () {
  const cleanups: Array<() => Promise<void> | void> = [];

  async function setupProxySession() {
    const upstreamServer = new WebSocketServer({port: 0, host: '127.0.0.1'});
    const upstreamPort = await listen(upstreamServer);
    const upstreamSockets: WebSocket[] = [];
    const upstreamConnected = new Promise<WebSocket>((resolve) => {
      upstreamServer.once('connection', (sock) => {
        upstreamSockets.push(sock);
        resolve(sock);
      });
    });

    const driver = new ProxyTestDriver();
    const [sessionId] = await driver.createSession({
      alwaysMatch: {platformName: 'Fake'},
      firstMatch: [{}],
    });
    driver.proxyUrl = `ws://127.0.0.1:${upstreamPort}`;

    const appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    appium.sessions[sessionId] = driver as unknown as ExternalDriver;

    const appiumServer = new WebSocketServer({port: 0, host: '127.0.0.1'});
    const appiumPort = await listen(appiumServer);
    appiumServer.on('connection', (ws: WebSocket, req: IncomingMessage) => appium.onBidiConnection(ws, req));

    const client = new WebSocket(`ws://127.0.0.1:${appiumPort}/bidi/${sessionId}`);
    const clientQueue = createJsonQueue(client);
    await new Promise<void>((resolve) => client.once('open', resolve));
    const upstreamSocket = await upstreamConnected;
    const upstreamQueue = createJsonQueue(upstreamSocket);

    cleanups.push(async () => {
      driver.eventEmitter.removeAllListeners();
      client.terminate();
      for (const sock of upstreamSockets) {
        sock.terminate();
      }
      await driver.deleteSession();
      await new Promise<void>((resolve) => appiumServer.close(() => resolve()));
      await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
      sinon.restore();
    });

    return {
      appium,
      driver,
      sessionId,
      appiumServer,
      appiumPort,
      upstreamServer,
      upstreamSockets,
      client,
      clientQueue,
      upstreamSocket,
      upstreamQueue,
    };
  }

  afterEach(async function () {
    for (const fn of cleanups.splice(0).reverse()) {
      await fn();
    }
  });

  it('handles Appium-only events locally without forwarding to upstream', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const keepaliveSub = await sendAndReceive(client, clientQueue, {
      id: 90,
      method: 'session.subscribe',
      params: {events: ['appium:keepalive']},
    });
    assert.equal(keepaliveSub.type, 'success');

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 1,
      method: 'session.subscribe',
      params: {
        events: ['appium:android.contextUpdated', 'appium:mediaStream.keyframeRequested', 'appium.contextUpdated'],
      },
    });
    assert.equal(subRes.id, 1);
    assert.equal(subRes.type, 'success');
    const subId = (subRes.result as StringRecord).subscription as string;
    assert.ok(subId);

    // Confirm neither Appium-only subscribe reached upstream by round-tripping a sentinel command.
    await roundTripSentinel(client, clientQueue, upstreamSocket, upstreamQueue, 901);

    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:android.contextUpdated',
      context: 'NATIVE_APP',
      params: {name: 'WEBVIEW_1'},
    });
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:mediaStream.keyframeRequested',
      params: {reason: 'late-subscriber'},
    });
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium.contextUpdated',
      params: {name: 'NATIVE_APP'},
    });

    const ev1 = await clientQueue.next();
    const ev2 = await clientQueue.next();
    const ev3 = await clientQueue.next();
    assert.deepEqual(
      [ev1.method, ev2.method, ev3.method],
      ['appium:android.contextUpdated', 'appium:mediaStream.keyframeRequested', 'appium.contextUpdated'],
    );

    const unsubRes = await sendAndReceive(client, clientQueue, {
      id: 2,
      method: 'session.unsubscribe',
      params: {subscriptions: [subId]},
    });
    assert.deepEqual(unsubRes, {id: 2, type: 'success', result: {}});
    await roundTripSentinel(client, clientQueue, upstreamSocket, upstreamQueue, 902);

    // Emit to the unsubscribed event then a still-subscribed sentinel event to prove filtering.
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:android.contextUpdated',
      params: {name: 'NATIVE_APP'},
    });
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:keepalive',
      params: {ok: true},
    });
    const nextClientEv = await clientQueue.next();
    assert.equal(nextClientEv.method, 'appium:keepalive');
    assert.equal(clientQueue.pendingCount(), 0);
  });

  it('respects context scoping on local Appium event subscriptions', async function () {
    const {driver, client, clientQueue} = await setupProxySession();

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 1,
      method: 'session.subscribe',
      params: {events: ['appium:xcuitest.contextUpdated'], contexts: ['WEBVIEW_1']},
    });
    assert.equal(subRes.type, 'success');

    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:xcuitest.contextUpdated',
      context: 'NATIVE_APP',
      params: {ignored: true},
    });
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:xcuitest.contextUpdated',
      context: 'WEBVIEW_1',
      params: {delivered: true},
    });
    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:xcuitest.contextUpdated',
      context: 'WEBVIEW_1',
      params: {sentinel: true},
    });

    const ev = await clientQueue.next();
    assert.equal(ev.method, 'appium:xcuitest.contextUpdated');
    assert.equal(ev.context, 'WEBVIEW_1');
    assert.deepEqual(ev.params, {delivered: true});

    const sentinelEv = await clientQueue.next();
    assert.deepEqual(sentinelEv.params, {sentinel: true});
    assert.equal(clientQueue.pendingCount(), 0);
  });

  for (const eventName of ['log.entryAdded', 'log']) {
    it(`delivers both Appium and upstream events for shared '${eventName}' and unsubscribes both`, async function () {
      const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();
      const upstreamHandled: StringRecord[] = [];
      let upstreamSubSeq = 0;

      const responder = (async () => {
        const subReq = await upstreamQueue.next();
        upstreamHandled.push(subReq);
        assert.equal(subReq.method, 'session.subscribe');
        assert.deepEqual((subReq.params as StringRecord).events, [eventName]);
        const upId = `up-${++upstreamSubSeq}`;
        upstreamSocket.send(JSON.stringify({id: subReq.id, type: 'success', result: {subscription: upId}}));

        const unsubReq = await upstreamQueue.next();
        upstreamHandled.push(unsubReq);
        assert.equal(unsubReq.method, 'session.unsubscribe');
        assert.deepEqual((unsubReq.params as StringRecord).subscriptions, [upId]);
        upstreamSocket.send(JSON.stringify({id: unsubReq.id, type: 'success', result: {}}));
      })();

      const sentinelSub = await sendAndReceive(client, clientQueue, {
        id: 9,
        method: 'session.subscribe',
        params: {events: ['appium:sharedSentinel']},
      });
      assert.equal(sentinelSub.type, 'success');

      const subRes = await sendAndReceive(client, clientQueue, {
        id: 10,
        method: 'session.subscribe',
        params: {events: [eventName]},
      });
      assert.equal(subRes.id, 10);
      assert.equal(subRes.type, 'success');
      const clientSubId = (subRes.result as StringRecord).subscription as string;
      assert.notEqual(clientSubId, 'up-1');

      driver.eventEmitter.emit(BIDI_EVENT_NAME, {
        method: 'log.entryAdded',
        params: {type: 'syslog', text: 'logcat line'},
      });
      upstreamSocket.send(
        JSON.stringify({
          type: 'event',
          method: 'log.entryAdded',
          params: {type: 'console', text: 'browser console line'},
        }),
      );

      const evA = await clientQueue.next();
      const evB = await clientQueue.next();
      const texts = [(evA.params as StringRecord).text as string, (evB.params as StringRecord).text as string].sort(
        (a, b) => a.localeCompare(b),
      );
      assert.deepEqual(texts, ['browser console line', 'logcat line']);

      const unsubRes = await sendAndReceive(client, clientQueue, {
        id: 11,
        method: 'session.unsubscribe',
        params: {subscriptions: [clientSubId]},
      });
      assert.deepEqual(unsubRes, {id: 11, type: 'success', result: {}});
      await responder;
      assert.equal(upstreamHandled.length, 2);

      // Local subscription is removed too: sentinel fires without dropped log event.
      driver.eventEmitter.emit(BIDI_EVENT_NAME, {
        method: 'log.entryAdded',
        params: {type: 'syslog', text: 'should not arrive'},
      });
      driver.eventEmitter.emit(BIDI_EVENT_NAME, {
        method: 'appium:sharedSentinel',
        params: {done: true},
      });
      const nextEv = await clientQueue.next();
      assert.equal(nextEv.method, 'appium:sharedSentinel');
      assert.equal(clientQueue.pendingCount(), 0);
    });
  }

  it('splits mixed Appium + browser subscribe and merges unsubscribe across local and upstream IDs', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      // 1. Mixed subscribe: upstream receives ONLY browsingContext.load.
      const mixedSub = await upstreamQueue.next();
      assert.equal(mixedSub.method, 'session.subscribe');
      assert.deepEqual((mixedSub.params as StringRecord).events, ['browsingContext.load']);
      upstreamSocket.send(JSON.stringify({id: mixedSub.id, type: 'success', result: {subscription: 'up-mixed'}}));

      // 2. Pure browser subscribe forwarded with a synthetic upstream ID and restored to client ID 20.
      const browserSub = await upstreamQueue.next();
      assert.notEqual(browserSub.id, 20);
      assert.equal(browserSub.method, 'session.subscribe');
      assert.deepEqual((browserSub.params as StringRecord).events, ['network.beforeRequestSent']);
      upstreamSocket.send(JSON.stringify({id: browserSub.id, type: 'success', result: {subscription: 'up-browser'}}));

      // 3. Combined unsubscribe: upstream receives both up-mixed and up-browser.
      const unsub = await upstreamQueue.next();
      assert.equal(unsub.method, 'session.unsubscribe');
      assert.deepEqual((unsub.params as StringRecord).subscriptions, ['up-mixed', 'up-browser']);
      upstreamSocket.send(JSON.stringify({id: unsub.id, type: 'success', result: {}}));
    })();

    const mixedRes = await sendAndReceive(client, clientQueue, {
      id: 19,
      method: 'session.subscribe',
      params: {events: ['browsingContext.load', 'appium:android.contextUpdated']},
    });
    assert.equal(mixedRes.id, 19);
    const mixedClientId = (mixedRes.result as StringRecord).subscription as string;

    const browserRes = await sendAndReceive(client, clientQueue, {
      id: 20,
      method: 'session.subscribe',
      params: {events: ['network.beforeRequestSent']},
    });
    assert.equal(browserRes.id, 20);
    assert.equal((browserRes.result as StringRecord).subscription, 'up-browser');

    const unsubRes = await sendAndReceive(client, clientQueue, {
      id: 21,
      method: 'session.unsubscribe',
      params: {subscriptions: [mixedClientId, 'up-browser']},
    });
    assert.deepEqual(unsubRes, {id: 21, type: 'success', result: {}});
    await responder;
    assert.deepEqual(driver.bidiEventSubs, {});
  });

  it('forwards userContexts for shared log.entryAdded upstream and rejects userContexts on Appium events', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      const req = await upstreamQueue.next();
      assert.notEqual(req.id, 30);
      assert.deepEqual(req.params, {events: ['log.entryAdded'], userContexts: ['user-1']});
      upstreamSocket.send(JSON.stringify({id: req.id, type: 'success', result: {subscription: 'up-uc'}}));
    })();

    const sharedUcRes = await sendAndReceive(client, clientQueue, {
      id: 30,
      method: 'session.subscribe',
      params: {events: ['log.entryAdded'], userContexts: ['user-1']},
    });
    assert.deepEqual(sharedUcRes, {id: 30, type: 'success', result: {subscription: 'up-uc'}});
    await responder;
    assert.deepEqual(driver.bidiEventSubs, {});

    const appiumUcRes = await sendAndReceive(client, clientQueue, {
      id: 31,
      method: 'session.subscribe',
      params: {events: ['appium:android.contextUpdated'], userContexts: ['user-1']},
    });
    assert.equal(appiumUcRes.id, 31);
    assert.equal(appiumUcRes.type, 'error');
    assert.equal(appiumUcRes.error, 'unsupported operation');
  });

  it('propagates upstream subscribe errors without mutating local subscriptions and rolls back upstream if local fails', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      // 1. Upstream rejects bad.event.
      const errReq = await upstreamQueue.next();
      upstreamSocket.send(
        JSON.stringify({
          id: errReq.id,
          type: 'error',
          error: 'invalid argument',
          message: 'Invalid event name: bad.event',
        }),
      );

      // 2. Upstream accepts browsingContext.load, then local fails on userContexts -> expect rollback unsubscribe.
      const okReq = await upstreamQueue.next();
      upstreamSocket.send(JSON.stringify({id: okReq.id, type: 'success', result: {subscription: 'up-rollback'}}));
      const rollbackReq = await upstreamQueue.next();
      assert.equal(rollbackReq.method, 'session.unsubscribe');
      assert.deepEqual((rollbackReq.params as StringRecord).subscriptions, ['up-rollback']);
      upstreamSocket.send(JSON.stringify({id: rollbackReq.id, type: 'success', result: {}}));
    })();

    const upstreamErrRes = await sendAndReceive(client, clientQueue, {
      id: 40,
      method: 'session.subscribe',
      params: {events: ['bad.event', 'appium:android.contextUpdated']},
    });
    assert.equal(upstreamErrRes.id, 40);
    assert.equal(upstreamErrRes.type, 'error');
    assert.equal(upstreamErrRes.error, 'invalid argument');
    assert.deepEqual(driver.bidiEventSubs, {});

    const rollbackErrRes = await sendAndReceive(client, clientQueue, {
      id: 41,
      method: 'session.subscribe',
      params: {events: ['browsingContext.load', 'appium:android.contextUpdated'], userContexts: ['u1']},
    });
    assert.equal(rollbackErrRes.id, 41);
    assert.equal(rollbackErrRes.type, 'error');
    assert.equal(rollbackErrRes.error, 'unsupported operation');
    assert.deepEqual(driver.bidiEventSubs, {});
    await responder;
  });

  it('rolls back upstream subscription when local bidiSubscribe omits subscription ID', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();
    sinon.stub(driver, 'bidiSubscribe').resolves({} as {subscription: string});

    const responder = (async () => {
      const okReq = await upstreamQueue.next();
      assert.equal(okReq.method, 'session.subscribe');
      upstreamSocket.send(JSON.stringify({id: okReq.id, type: 'success', result: {subscription: 'up-no-local-id'}}));

      const rollbackReq = await upstreamQueue.next();
      assert.equal(rollbackReq.method, 'session.unsubscribe');
      assert.deepEqual((rollbackReq.params as StringRecord).subscriptions, ['up-no-local-id']);
      upstreamSocket.send(JSON.stringify({id: rollbackReq.id, type: 'success', result: {}}));
    })();

    const errRes = await sendAndReceive(client, clientQueue, {
      id: 42,
      method: 'session.subscribe',
      params: {events: ['browsingContext.load', 'appium:android.contextUpdated']},
    });
    assert.equal(errRes.id, 42);
    assert.equal(errRes.type, 'error');
    assert.equal(errRes.error, 'unknown error');
    assert.match(String(errRes.message), /did not return a subscription id/i);
    assert.deepEqual(driver.bidiEventSubs, {});
    await responder;
  });

  it('keeps local subscriptions intact if upstream rejects a mixed unsubscribe', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 50,
      method: 'session.subscribe',
      params: {events: ['appium:android.contextUpdated']},
    });
    const localId = (subRes.result as StringRecord).subscription as string;

    const responder = (async () => {
      const req = await upstreamQueue.next();
      assert.equal(req.method, 'session.unsubscribe');
      assert.deepEqual((req.params as StringRecord).subscriptions, ['missing-up']);
      upstreamSocket.send(
        JSON.stringify({id: req.id, type: 'error', error: 'invalid argument', message: 'Unknown subscription'}),
      );
    })();

    const unsubErr = await sendAndReceive(client, clientQueue, {
      id: 51,
      method: 'session.unsubscribe',
      params: {subscriptions: [localId, 'missing-up']},
    });
    assert.equal(unsubErr.id, 51);
    assert.equal(unsubErr.type, 'error');
    await responder;
    assert.deepEqual(driver.bidiEventSubs, {'appium:android.contextUpdated': ['']});
  });

  it('clears tracked entry if local ID unsubscribe fails and treats already-removed local IDs as success', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      const subReq = await upstreamQueue.next();
      upstreamSocket.send(JSON.stringify({id: subReq.id, type: 'success', result: {subscription: 'up-partial'}}));

      const unsubReq = await upstreamQueue.next();
      assert.equal(unsubReq.method, 'session.unsubscribe');
      assert.deepEqual((unsubReq.params as StringRecord).subscriptions, ['up-partial']);
      upstreamSocket.send(JSON.stringify({id: unsubReq.id, type: 'success', result: {}}));
    })();

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 55,
      method: 'session.subscribe',
      params: {events: ['log.entryAdded']},
    });
    const subId = (subRes.result as StringRecord).subscription as string;

    const realExecute = driver.executeBidiCommand.bind(driver);
    let failNextLocalUnsub = true;
    sinon.stub(driver, 'executeBidiCommand').callsFake(async (method, params) => {
      if (method === 'session.unsubscribe' && failNextLocalUnsub) {
        failNextLocalUnsub = false;
        throw new Error('Transient local unsubscribe failure');
      }
      return await realExecute(method, params);
    });

    const partialErr = await sendAndReceive(client, clientQueue, {
      id: 56,
      method: 'session.unsubscribe',
      params: {subscriptions: [subId]},
    });
    assert.equal(partialErr.id, 56);
    assert.equal(partialErr.type, 'error');
    await responder;

    // Retrying now forwards directly upstream (since bridge dropped its stale entry rather than keeping up-partial wedged).
    const retryResponder = (async () => {
      const retryReq = await upstreamQueue.next();
      assert.equal(retryReq.method, 'session.unsubscribe');
      assert.deepEqual((retryReq.params as StringRecord).subscriptions, [subId]);
      upstreamSocket.send(
        JSON.stringify({id: retryReq.id, type: 'error', error: 'invalid argument', message: 'Unknown subscription'}),
      );
    })();
    const retryRes = await sendAndReceive(client, clientQueue, {
      id: 57,
      method: 'session.unsubscribe',
      params: {subscriptions: [subId]},
    });
    assert.equal(retryRes.id, 57);
    assert.equal(retryRes.type, 'error');
    await retryResponder;

    // Unknown local ID (e.g. removed out-of-band) is treated idempotently as success once upstream succeeds.
    const sub2Res = await sendAndReceive(client, clientQueue, {
      id: 58,
      method: 'session.subscribe',
      params: {events: ['appium:android.contextUpdated']},
    });
    const sub2Id = (sub2Res.result as StringRecord).subscription as string;
    await realExecute('session.unsubscribe', {events: ['appium:android.contextUpdated']});
    await realExecute('session.unsubscribe', {subscriptions: [sub2Id]});
    const idempotentRes = await sendAndReceive(client, clientQueue, {
      id: 59,
      method: 'session.unsubscribe',
      params: {subscriptions: [sub2Id]},
    });
    assert.deepEqual(idempotentRes, {id: 59, type: 'success', result: {}});
  });

  it('supports legacy event-based unsubscribe and subsequent ID unsubscribe without stale upstream call', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      const subReq = await upstreamQueue.next();
      upstreamSocket.send(JSON.stringify({id: subReq.id, type: 'success', result: {subscription: 'up-log'}}));
      const unsubReq = await upstreamQueue.next();
      assert.equal(unsubReq.method, 'session.unsubscribe');
      assert.deepEqual((unsubReq.params as StringRecord).events, ['log.entryAdded']);
      upstreamSocket.send(JSON.stringify({id: unsubReq.id, type: 'success', result: {}}));
    })();

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 60,
      method: 'session.subscribe',
      params: {events: ['log.entryAdded', 'appium:android.contextUpdated']},
    });
    const subId = (subRes.result as StringRecord).subscription as string;

    const legacySharedUnsub = await sendAndReceive(client, clientQueue, {
      id: 61,
      method: 'session.unsubscribe',
      params: {events: ['log.entryAdded']},
    });
    assert.deepEqual(legacySharedUnsub, {id: 61, type: 'success', result: {}});
    assert.deepEqual(driver.bidiEventSubs, {'appium:android.contextUpdated': ['']});
    await responder;

    // Subsequent ID unsubscribe for the remaining Appium event must NOT hit upstream with stale 'up-log'.
    const idUnsub = await sendAndReceive(client, clientQueue, {
      id: 62,
      method: 'session.unsubscribe',
      params: {subscriptions: [subId]},
    });
    assert.deepEqual(idUnsub, {id: 62, type: 'success', result: {}});
    assert.deepEqual(driver.bidiEventSubs, {});
    await roundTripSentinel(client, clientQueue, upstreamSocket, upstreamQueue, 63);
  });

  it('allocates a unique client subscription ID when local ID collides with an upstream subscription ID', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();
    const collidingId = 'colliding-sub-id';

    const responder = (async () => {
      const subReq = await upstreamQueue.next();
      upstreamSocket.send(JSON.stringify({id: subReq.id, type: 'success', result: {subscription: collidingId}}));
    })();

    const browserSub = await sendAndReceive(client, clientQueue, {
      id: 65,
      method: 'session.subscribe',
      params: {events: ['browsingContext.load']},
    });
    assert.equal((browserSub.result as StringRecord).subscription, collidingId);
    await responder;

    const realExecute = driver.executeBidiCommand.bind(driver);
    const execStub = sinon.stub(driver, 'executeBidiCommand').callsFake(async (method, params) => {
      if (method === 'session.subscribe') {
        return {subscription: collidingId};
      }
      return await realExecute(method, params);
    });

    const localSub = await sendAndReceive(client, clientQueue, {
      id: 66,
      method: 'session.subscribe',
      params: {events: ['appium:android.contextUpdated']},
    });
    const clientSubId = (localSub.result as StringRecord).subscription as string;
    assert.notEqual(clientSubId, collidingId);

    const unsubRes = await sendAndReceive(client, clientQueue, {
      id: 67,
      method: 'session.unsubscribe',
      params: {subscriptions: [clientSubId]},
    });
    assert.deepEqual(unsubRes, {id: 67, type: 'success', result: {}});
    assert.ok(execStub.calledWithExactly('session.unsubscribe', {subscriptions: [collidingId]}));
    await roundTripSentinel(client, clientQueue, upstreamSocket, upstreamQueue, 68);
  });

  it('remaps concurrent pass-through IDs across synthetic wrap-around and errors cleanly on ID exhaustion', async function () {
    const driver = new ProxyTestDriver();
    await driver.createSession({alwaysMatch: {platformName: 'Fake'}, firstMatch: [{}]});
    cleanups.push(() => driver.deleteSession());

    const sentToClient: StringRecord[] = [];
    const sentToUpstream: StringRecord[] = [];
    const fakeClient = Object.assign(new EventEmitter(), {
      readyState: WebSocket.OPEN,
      close: () => {},
    }) as unknown as WebSocket;
    const fakeUpstream = Object.assign(new EventEmitter(), {
      readyState: WebSocket.OPEN,
      close: () => {},
      terminate: () => {},
    }) as unknown as WebSocket;

    const bridge = new BidiProxyBridge(
      fakeClient,
      fakeUpstream,
      driver as unknown as ExternalDriver,
      async (data) => {
        sentToClient.push(JSON.parse(data.toString()) as StringRecord);
      },
      async (data) => {
        sentToUpstream.push(JSON.parse(data.toString()) as StringRecord);
      },
      {syntheticIdRange: {min: 1, max: 3}},
    );
    bridge.attachUpstreamHandlers();

    const p1 = bridge.handleClientMessage(
      Buffer.from(JSON.stringify({id: 10, method: 'browsingContext.getTree', params: {}})),
    );
    const p2 = bridge.handleClientMessage(Buffer.from(JSON.stringify({id: 11, method: 'session.status', params: {}})));
    await setImmediate();
    assert.deepEqual(
      sentToUpstream.map((m) => m.id),
      [1, 2],
    );

    // Both synthetic slots (1 and 2) are in flight -> 3rd concurrent command receives an error frame.
    await bridge.handleClientMessage(Buffer.from(JSON.stringify({id: 12, method: 'session.status', params: {}})));
    assert.equal(sentToClient.length, 1);
    assert.equal(sentToClient[0].id, 12);
    assert.equal(sentToClient[0].type, 'error');
    assert.match(String(sentToClient[0].message), /Exhausted synthetic BiDi proxy command IDs/);

    // Complete request 1 while 2 remains in flight -> wrap-around skips busy 2 and reuses synthetic ID 1.
    fakeUpstream.emit('message', Buffer.from(JSON.stringify({id: 1, type: 'success', result: {ok: 1}})), false);
    await p1;

    const p4 = bridge.handleClientMessage(
      Buffer.from(JSON.stringify({id: 13, method: 'browsingContext.reload', params: {}})),
    );
    await setImmediate();
    assert.equal(sentToUpstream[2].id, 1);

    fakeUpstream.emit('message', Buffer.from(JSON.stringify({id: 1, type: 'success', result: {ok: 4}})), false);
    fakeUpstream.emit('message', Buffer.from(JSON.stringify({id: 2, type: 'success', result: {ok: 2}})), false);
    await Promise.all([p2, p4]);

    assert.deepEqual(
      sentToClient.map((m) => [m.id, m.type]),
      [
        [12, 'error'],
        [10, 'success'],
        [13, 'success'],
        [11, 'success'],
      ],
    );
    bridge.dispose();
  });

  it('avoids synthetic ID collisions and suspends idle timeout while intercepted subscribe awaits upstream', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    await driver.clearNewCommandTimeout();
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});

    try {
      driver.newCommandTimeoutMs = 1000;
      await driver.startNewCommandTimeout();

      // Start an intercepted subscribe (uses synthetic ID 1_000_000_000).
      client.send(
        JSON.stringify({
          id: 70,
          method: 'session.subscribe',
          params: {events: ['log.entryAdded']},
        }),
      );
      const subUpReq = await upstreamQueue.next();
      const syntheticId = subUpReq.id as number;

      // Concurrently send a pass-through command carrying that exact synthetic ID.
      client.send(
        JSON.stringify({
          id: syntheticId,
          method: 'browsingContext.getTree',
          params: {},
        }),
      );
      const getTreeUpReq = await upstreamQueue.next();
      assert.notEqual(getTreeUpReq.id, syntheticId);

      // Idle timeout remains suspended while both are pending.
      await clock.tickAsync(2000);
      assert.notEqual(driver.sessionId, null);

      // Respond to pass-through first, then subscribe.
      upstreamSocket.send(JSON.stringify({id: getTreeUpReq.id, type: 'success', result: {contexts: []}}));
      const getTreeRes = await clientQueue.next();
      assert.deepEqual(getTreeRes, {id: syntheticId, type: 'success', result: {contexts: []}});

      upstreamSocket.send(JSON.stringify({id: syntheticId, type: 'success', result: {subscription: 'up-sync'}}));
      const subRes = await clientQueue.next();
      assert.equal(subRes.id, 70);
      assert.equal(subRes.type, 'success');

      await clock.tickAsync(999);
      assert.notEqual(driver.sessionId, null);
      await clock.tickAsync(1);
      assert.equal(driver.sessionId, null);
    } finally {
      await driver.clearNewCommandTimeout();
      clock.restore();
    }
  });

  it('cleans up pending commands and local subscriptions via cleanupBidiSockets on session close', async function () {
    const {appium, driver, sessionId, client, clientQueue, upstreamQueue} = await setupProxySession();

    const subRes = await sendAndReceive(client, clientQueue, {
      id: 75,
      method: 'session.subscribe',
      params: {events: ['appium:android.contextUpdated']},
    });
    assert.equal(subRes.type, 'success');
    assert.deepEqual(driver.bidiEventSubs, {'appium:android.contextUpdated': ['']});

    // Leave a proxied command pending mid-flight while cleanupBidiSockets runs.
    await driver.clearNewCommandTimeout();
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    try {
      driver.newCommandTimeoutMs = 500;
      await driver.startNewCommandTimeout();
      client.send(JSON.stringify({id: 76, method: 'browsingContext.getTree', params: {}}));
      await upstreamQueue.next();

      const closed = new Promise<void>((resolve) => client.once('close', () => resolve()));
      appium.cleanupBidiSockets(sessionId);
      await closed;
      await setImmediate();

      assert.deepEqual(driver.bidiEventSubs, {});
      // Pending command waiter was released by dispose() so idle timeout expires normally.
      await clock.tickAsync(500);
      assert.equal(driver.sessionId, null);
    } finally {
      await driver.clearNewCommandTimeout();
      clock.restore();
    }
  });

  it('releases local subscriptions across reconnects without hitting MAX_BIDI_SUBSCRIPTIONS', async function () {
    const {driver, sessionId, appiumPort, upstreamServer, upstreamSockets} = await setupProxySession();
    // Drain initial connection setup socket handlers while keeping session alive across 105 reconnects.
    for (const sock of upstreamSockets) {
      sock.close();
    }

    // Exceeds BaseDriver's per-driver MAX_BIDI_SUBSCRIPTIONS cap (100) unless disconnect cleanup frees prior slots.
    for (let i = 0; i < 105; ++i) {
      const nextUpstream = new Promise<WebSocket>((resolve) => {
        upstreamServer.once('connection', (sock) => {
          upstreamSockets.push(sock);
          resolve(sock);
        });
      });
      const reconnectClient = new WebSocket(`ws://127.0.0.1:${appiumPort}/bidi/${sessionId}`);
      const reconnectQueue = createJsonQueue(reconnectClient);
      await new Promise<void>((resolve) => reconnectClient.once('open', resolve));
      const upSock = await nextUpstream;

      const subRes = await sendAndReceive(reconnectClient, reconnectQueue, {
        id: i + 1,
        method: 'session.subscribe',
        params: {events: ['appium:reconnect.event']},
      });
      assert.equal(subRes.type, 'success');

      const upstreamClosed = new Promise<void>((resolve) => upSock.once('close', () => resolve()));
      reconnectClient.close();
      await upstreamClosed;
    }

    await setImmediate();
    assert.deepEqual(driver.bidiEventSubs, {});
  });

  it('aborts pending intercepted subscribe cleanly when upstream closes mid-flight', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    await driver.clearNewCommandTimeout();
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    try {
      driver.newCommandTimeoutMs = 500;
      await driver.startNewCommandTimeout();

      client.send(
        JSON.stringify({
          id: 80,
          method: 'session.subscribe',
          params: {events: ['log.entryAdded']},
        }),
      );
      await upstreamQueue.next();

      const closed = new Promise<void>((resolve) => client.once('close', () => resolve()));
      upstreamSocket.close();
      await closed;
      await setImmediate();

      if (clientQueue.pendingCount() > 0) {
        const errFrame = await clientQueue.next();
        assert.equal(errFrame.id, 80);
        assert.equal(errFrame.type, 'error');
      }
      assert.equal(clientQueue.pendingCount(), 0);

      // Pending command waiter was aborted on upstream close so session idle timeout recovers cleanly.
      await clock.tickAsync(500);
      assert.equal(driver.sessionId, null);
    } finally {
      await driver.clearNewCommandTimeout();
      clock.restore();
    }
  });
});
