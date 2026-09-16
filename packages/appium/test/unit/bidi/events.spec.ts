import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {AppiumLogger, BidiEventOrigin, BidiEventPayload} from '@appium/types';
import WebSocket from 'ws';

import {createBidiEventDispatcher, initBidiProxyHandlers} from '../../../lib/bidi/events.js';
import type {BidiProxyClient} from '../../../lib/bidi/proxy-client.js';

interface LoggedLine {
  level: 'debug' | 'warn';
  msg: string;
}

function makeDriver(bidiEventSubs: Record<string, string[]> = {}) {
  const logs: LoggedLine[] = [];
  const log = {
    debug: (msg: string) => logs.push({level: 'debug', msg}),
    warn: (msg: string) => logs.push({level: 'warn', msg}),
  } as unknown as AppiumLogger;
  return {bidiEventSubs, log, logs};
}

function makeWs(readyState: number = WebSocket.OPEN) {
  return {readyState} as unknown as WebSocket;
}

function makeSend() {
  const sent: string[] = [];
  const send = async (data: string | Buffer) => {
    sent.push(data.toString());
  };
  return {send, sent};
}

interface MockPlugin {
  name: string;
  handleBidiEvent?: (
    next: (event?: BidiEventPayload) => Promise<void>,
    driver: unknown,
    event: BidiEventPayload,
    origin: BidiEventOrigin,
  ) => Promise<void>;
}

describe('createBidiEventDispatcher', function () {
  it('sends an event to the client when the client is subscribed', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'my.event', params: {a: 1}, context: ''}, {type: 'driver'});

    assert.equal(sent.length, 1);
    assert.deepEqual(JSON.parse(sent[0]), {type: 'event', context: '', method: 'my.event', params: {a: 1}});
  });

  it('does not send an event the client is not subscribed to', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'my.event', params: {}}, {type: 'driver'});

    assert.equal(sent.length, 0);
  });

  it('sends an event covered by a module-wide subscription (subscribed to the bare module name)', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({browsingContext: ['']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'browsingContext.load', params: {}, context: ''}, {type: 'driver'});

    assert.equal(sent.length, 1);
    assert.equal(JSON.parse(sent[0]).method, 'browsingContext.load');
  });

  it('does not send an event when the module-wide subscription is for a different context', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({browsingContext: ['ctx-1']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'browsingContext.load', params: {}, context: 'ctx-2'}, {type: 'driver'});

    assert.equal(sent.length, 0);
  });

  it('sends an event to a real context id when subscribed with the "" (all contexts) wildcard', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'browsingContext.load': ['']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'browsingContext.load', params: {}, context: 'real-ctx-id'}, {type: 'driver'});

    assert.equal(sent.length, 1);
    assert.equal(JSON.parse(sent[0]).context, 'real-ctx-id');
  });

  it('delivers an event from a descendant context observed via a prior browsingContext.contextCreated event', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({browsingContext: ['tab-1']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    // frame-1's own contextCreated event is itself covered, as a descendant of tab-1, and
    // observing it is what teaches the dispatcher about the frame-1 -> tab-1 relationship
    await dispatch(
      {method: 'browsingContext.contextCreated', params: {context: 'frame-1', parent: 'tab-1'}, context: 'frame-1'},
      {type: 'driver'},
    );
    assert.equal(sent.length, 1);

    await dispatch({method: 'browsingContext.load', params: {}, context: 'frame-1'}, {type: 'driver'});

    assert.equal(sent.length, 2);
  });

  it('does not deliver an event from an unrelated, untracked context', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({browsingContext: ['tab-1']});
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [], send, {});

    await dispatch({method: 'browsingContext.load', params: {}, context: 'unrelated-ctx'}, {type: 'driver'});

    assert.equal(sent.length, 0);
  });

  it('runs plugins in last-declared-first order, matching the command chain convention', async function () {
    const order: string[] = [];
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const pluginA: MockPlugin = {
      name: 'a',
      handleBidiEvent: async (next) => {
        order.push('a');
        await next();
      },
    };
    const pluginB: MockPlugin = {
      name: 'b',
      handleBidiEvent: async (next) => {
        order.push('b');
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [pluginA, pluginB] as any, send, {});

    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'driver'});

    assert.deepEqual(order, ['b', 'a']);
    assert.equal(sent.length, 1);
  });

  it('a plugin can veto an event by not calling next', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const plugin: MockPlugin = {name: 'vetoer', handleBidiEvent: async () => {}};
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'driver'});

    assert.equal(sent.length, 0);
  });

  it('a plugin can modify the event payload seen downstream and by the client', async function () {
    const seenByInner: BidiEventPayload[] = [];
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const inner: MockPlugin = {
      name: 'inner',
      handleBidiEvent: async (next, _driver, event) => {
        seenByInner.push(event);
        await next();
      },
    };
    const outer: MockPlugin = {
      name: 'outer',
      handleBidiEvent: async (next, _driver, event) => {
        await next({...event, params: {...event.params, fromOuter: true}});
      },
    };
    // declared inner-first, outer-second -> outer is last-declared, so it runs first (outermost)
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [inner, outer] as any, send, {});

    await dispatch({method: 'my.event', params: {orig: 1}, context: ''}, {type: 'driver'});

    assert.deepEqual(seenByInner[0].params, {orig: 1, fromOuter: true});
    assert.equal(sent.length, 1);
    assert.deepEqual(JSON.parse(sent[0]).params, {orig: 1, fromOuter: true});
  });

  it('a plugin intercepts its own emitted event (self-interception)', async function () {
    const seenOrigins: BidiEventOrigin[] = [];
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const plugin: MockPlugin = {
      name: 'self',
      handleBidiEvent: async (next, _driver, _event, origin) => {
        seenOrigins.push(origin);
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'plugin', pluginName: 'self'});

    assert.deepEqual(seenOrigins, [{type: 'plugin', pluginName: 'self'}]);
    assert.equal(sent.length, 1);
  });

  it('skips a non-adopting plugin (no handleBidiEvent) without error', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'my.event': ['']});
    const plugin: MockPlugin = {name: 'noop'};
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'driver'});

    assert.equal(sent.length, 1);
  });

  it('applies the subscription gate after interception, regardless of plugin behavior', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({}); // nothing subscribed
    const plugin: MockPlugin = {
      name: 'pass',
      handleBidiEvent: async (next) => {
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'driver'});

    assert.equal(sent.length, 0);
  });

  it('drops the event and logs a warning if a plugin handler throws, without breaking the queue', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'boom.event': [''], 'my.event': ['']});
    const plugin: MockPlugin = {
      name: 'throws',
      handleBidiEvent: async (next, _driver, event) => {
        if (event.method === 'boom.event') {
          throw new Error('boom');
        }
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'boom.event', params: {}, context: ''}, {type: 'driver'});
    assert.equal(sent.length, 0);
    assert.ok(driver.logs.some((l) => l.level === 'warn'));

    // the queue must not be stuck -- a subsequent, unrelated event still processes normally
    await dispatch({method: 'my.event', params: {}, context: ''}, {type: 'driver'});
    assert.equal(sent.length, 1);
  });

  it('processes events in FIFO order on the wire even when handlers have staggered delays', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({e1: [''], e2: [''], e3: ['']});
    const plugin: MockPlugin = {
      name: 'staggered',
      handleBidiEvent: async (next, _driver, event) => {
        const delay = event.method === 'e1' ? 30 : event.method === 'e2' ? 10 : 0;
        await new Promise((resolve) => setTimeout(resolve, delay));
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await Promise.all([
      dispatch({method: 'e1', params: {}, context: ''}, {type: 'driver'}),
      dispatch({method: 'e2', params: {}, context: ''}, {type: 'driver'}),
      dispatch({method: 'e3', params: {}, context: ''}, {type: 'driver'}),
    ]);

    const methods = sent.map((s) => JSON.parse(s).method);
    assert.deepEqual(methods, ['e1', 'e2', 'e3']);
  });

  it('accepts events dispatched with origin type "proxy", using the same chain/gate logic', async function () {
    const {send, sent} = makeSend();
    const driver = makeDriver({'upstream.event': ['']});
    const seenOrigins: BidiEventOrigin[] = [];
    const plugin: MockPlugin = {
      name: 'watcher',
      handleBidiEvent: async (next, _driver, _event, origin) => {
        seenOrigins.push(origin);
        await next();
      },
    };
    const dispatch = createBidiEventDispatcher(makeWs(), driver as any, [plugin] as any, send, {});

    await dispatch({method: 'upstream.event', params: {}, context: ''}, {type: 'proxy'});

    assert.deepEqual(seenOrigins, [{type: 'proxy'}]);
    assert.equal(sent.length, 1);
  });
});

describe('initBidiProxyHandlers', function () {
  function makeFakeProxyClient() {
    const handlers: {
      close?: (code: number, reason: Buffer) => void;
    } = {};
    const client = {
      onUnsolicitedMessage: () => {},
      onClose: (handler: (code: number, reason: Buffer) => void) => {
        handlers.close = handler;
      },
      onError: () => {},
    } as unknown as BidiProxyClient;
    return {client, handlers};
  }

  it('rewrites a reserved WS close code (e.g. 1006, abnormal closure) to the fallback code', function () {
    const driver = makeDriver({});
    const {client, handlers} = makeFakeProxyClient();
    const closedWith: {code?: number} = {};
    const ws = {
      close: (code: number) => {
        closedWith.code = code;
      },
    } as unknown as WebSocket;

    initBidiProxyHandlers.call(driver as any, client, ws, (async () => {}) as any);
    handlers.close?.(1006, Buffer.from('abnormal closure'));

    assert.equal(closedWith.code, 1011);
  });

  it('passes through a valid, non-reserved close code unchanged', function () {
    const driver = makeDriver({});
    const {client, handlers} = makeFakeProxyClient();
    const closedWith: {code?: number} = {};
    const ws = {
      close: (code: number) => {
        closedWith.code = code;
      },
    } as unknown as WebSocket;

    initBidiProxyHandlers.call(driver as any, client, ws, (async () => {}) as any);
    handlers.close?.(1000, Buffer.from('normal closure'));

    assert.equal(closedWith.code, 1000);
  });
});
