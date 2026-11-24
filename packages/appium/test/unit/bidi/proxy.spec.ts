import assert from 'node:assert/strict';
import type {IncomingMessage} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import type {ExternalDriver, StringRecord} from '@appium/types';
import sinon from 'sinon';
import {WebSocket, WebSocketServer} from 'ws';

import {AppiumDriver} from '../../../lib/appium.js';
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

    return {appium, driver, sessionId, client, clientQueue, upstreamSocket, upstreamQueue};
  }

  afterEach(async function () {
    for (const fn of cleanups.splice(0).reverse()) {
      await fn();
    }
  });

  it('handles Appium-only events locally without forwarding to upstream', async function () {
    const {driver, client, clientQueue, upstreamQueue} = await setupProxySession();

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

    // Upstream never sees Appium-only subscribe.
    await setImmediate();
    assert.equal(upstreamQueue.pendingCount(), 0);

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
    assert.equal(upstreamQueue.pendingCount(), 0);

    driver.eventEmitter.emit(BIDI_EVENT_NAME, {
      method: 'appium:android.contextUpdated',
      params: {name: 'NATIVE_APP'},
    });
    await setImmediate();
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

    const ev = await clientQueue.next();
    assert.equal(ev.method, 'appium:xcuitest.contextUpdated');
    assert.equal(ev.context, 'WEBVIEW_1');
    assert.deepEqual(ev.params, {delivered: true});
    await setImmediate();
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

      // Local subscription is removed too.
      driver.eventEmitter.emit(BIDI_EVENT_NAME, {
        method: 'log.entryAdded',
        params: {type: 'syslog', text: 'should not arrive'},
      });
      await setImmediate();
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

      // 2. Pure browser subscribe forwarded directly.
      const browserSub = await upstreamQueue.next();
      assert.equal(browserSub.id, 20);
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
      assert.equal(req.id, 30);
      assert.deepEqual(req.params, {events: ['log.entryAdded'], userContexts: ['user-1']});
      upstreamSocket.send(JSON.stringify({id: 30, type: 'success', result: {subscription: 'up-uc'}}));
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

  it('supports legacy event-based unsubscribe on local and shared events', async function () {
    const {driver, client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

    const responder = (async () => {
      const subReq = await upstreamQueue.next();
      upstreamSocket.send(JSON.stringify({id: subReq.id, type: 'success', result: {subscription: 'up-log'}}));
      const unsubReq = await upstreamQueue.next();
      assert.equal(unsubReq.method, 'session.unsubscribe');
      assert.deepEqual((unsubReq.params as StringRecord).events, ['log.entryAdded']);
      upstreamSocket.send(JSON.stringify({id: unsubReq.id, type: 'success', result: {}}));
    })();

    await sendAndReceive(client, clientQueue, {
      id: 60,
      method: 'session.subscribe',
      params: {events: ['log.entryAdded', 'appium:android.contextUpdated']},
    });

    const localUnsub = await sendAndReceive(client, clientQueue, {
      id: 61,
      method: 'session.unsubscribe',
      params: {events: ['appium:android.contextUpdated']},
    });
    assert.deepEqual(localUnsub, {id: 61, type: 'success', result: {}});
    assert.equal(upstreamQueue.pendingCount(), 0);
    assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});

    const sharedUnsub = await sendAndReceive(client, clientQueue, {
      id: 62,
      method: 'session.unsubscribe',
      params: {events: ['log.entryAdded']},
    });
    assert.deepEqual(sharedUnsub, {id: 62, type: 'success', result: {}});
    assert.deepEqual(driver.bidiEventSubs, {});
    await responder;
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

  it('aborts pending intercepted subscribe cleanly when upstream closes mid-flight', async function () {
    const {client, clientQueue, upstreamSocket, upstreamQueue} = await setupProxySession();

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
    // Wait a tick to ensure no unhandled rejection occurs.
    await setImmediate();
    assert.ok(clientQueue.pendingCount() <= 1);
  });
});
