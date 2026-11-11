import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import type {BiDiBackpressureEvent, BiDiEvent, ExternalDriver} from '@appium/types';
import sinon from 'sinon';
import {WebSocket} from 'ws';

import {AppiumDriver} from '../../../lib/appium.js';

const MiB = 1024 * 1024;
const SESSION_ID = 'flow-session';
const METHOD = 'media.units';
const CHAIN = 'video';

class FakeSocket extends EventEmitter {
  readonly OPEN = WebSocket.OPEN;
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  readonly sent: Array<{data: string | Buffer; options: {binary?: boolean}}> = [];
  readonly close = sinon.spy((_code?: number, _reason?: string) => {
    this.readyState = WebSocket.CLOSING;
  });
  readonly terminate = sinon.spy(() => {
    this.readyState = WebSocket.CLOSED;
  });
  readonly ping = sinon.spy();

  send(data: string | Buffer, options: {binary?: boolean}, callback: () => void): void {
    this.sent.push({data, options});
    callback();
  }

  get methods(): string[] {
    return this.sent.map(({data}) => JSON.parse(data.toString()).params.id);
  }
}

describe('BiDi flow control', function () {
  let driver: BaseDriver<any>;
  let appium: AppiumDriver;
  const sockets: FakeSocket[] = [];

  function connect(args: Record<string, unknown> = {}): FakeSocket {
    appium = new AppiumDriver(args as ConstructorParameters<typeof AppiumDriver>[0]);
    return attach(appium);
  }

  function attach(target: AppiumDriver): FakeSocket {
    target.sessions[SESSION_ID] = driver as ExternalDriver;
    const socket = new FakeSocket();
    sockets.push(socket);
    target.onBidiConnection(socket as unknown as WebSocket, {url: `/bidi/${SESSION_ID}`} as IncomingMessage);
    return socket;
  }

  function emit(id: string, delivery?: BiDiEvent['delivery'], method = METHOD): void {
    driver.eventEmitter.emit('bidiEvent', {method, params: {id}, delivery});
  }

  beforeEach(async function () {
    driver = new BaseDriver();
    await driver.bidiSubscribe([METHOD, 'audio'], undefined);
  });

  afterEach(function () {
    driver.eventEmitter.removeAllListeners();
    for (const socket of sockets.splice(0)) {
      socket.removeAllListeners();
    }
    sinon.restore();
  });

  describe('event delivery', function () {
    it('serializes an event once for all connections and sends it as text', async function () {
      const first = connect();
      const second = attach(appium);
      emit('a');
      await setImmediate();
      assert.equal(first.sent.length, 1);
      assert.equal(first.sent[0].data, second.sent[0].data);
      assert.equal(first.sent[0].options.binary, false);
      assert.deepEqual(JSON.parse(first.sent[0].data.toString()), {
        type: 'event',
        context: '',
        method: METHOD,
        params: {id: 'a'},
      });
    });

    it('does not reuse a serialized event after the emitted object has been changed', async function () {
      const socket = connect();
      const event = {method: METHOD, params: {id: 'a'}};
      driver.eventEmitter.emit('bidiEvent', event);
      await setImmediate();
      event.params.id = 'b';
      driver.eventEmitter.emit('bidiEvent', event);
      await setImmediate();
      assert.deepEqual(socket.methods, ['a', 'b']);
    });

    it('serializes an object that is emitted again in the same tick as a new event', async function () {
      const socket = connect();
      const event = {method: METHOD, params: {id: 'a'}};
      driver.eventEmitter.emit('bidiEvent', event);
      event.params.id = 'b';
      driver.eventEmitter.emit('bidiEvent', event);
      await setImmediate();
      assert.deepEqual(socket.methods, ['a', 'b']);
    });

    it('removes the event listeners when the connection is closed', function () {
      const socket = connect();
      assert.equal(driver.eventEmitter.listenerCount('bidiEvent'), 1);
      socket.emit('close', 1000, Buffer.from(''));
      assert.equal(driver.eventEmitter.listenerCount('bidiEvent'), 0);
    });

    it('removes the event listeners when the session sockets are cleaned up', function () {
      connect();
      appium.cleanupBidiSockets(SESSION_ID);
      assert.equal(driver.eventEmitter.listenerCount('bidiEvent'), 0);
    });
  });

  describe('send buffer watchdog', function () {
    it('closes the connection that stays above the limit for too long', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
      const socket = connect({bidiMaxBufferedBytes: 10 * MiB, bidiMaxBufferedMs: 1000});
      socket.bufferedAmount = 11 * MiB;
      emit('a');
      await clock.tickAsync(999);
      assert.equal(socket.close.callCount, 0);
      assert.deepEqual(socket.methods, ['a']);

      await clock.tickAsync(1);
      emit('b');
      await clock.tickAsync(0);
      assert.equal(socket.close.callCount, 1);
      assert.equal(socket.close.firstCall.args[0], 1013);
      assert.deepEqual(socket.methods, ['a']);

      await clock.tickAsync(5000);
      assert.equal(socket.terminate.callCount, 1);
    });

    it('still terminates a closing connection that receives more events', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
      const socket = connect({bidiMaxBufferedBytes: 10 * MiB, bidiMaxBufferedMs: 0});
      socket.bufferedAmount = 11 * MiB;
      emit('a');
      emit('b');
      await clock.tickAsync(5000);
      assert.equal(socket.terminate.callCount, 1);
    });

    it('resets the timer once the buffer drains', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']});
      const socket = connect({bidiMaxBufferedBytes: 10 * MiB, bidiMaxBufferedMs: 1000});
      socket.bufferedAmount = 11 * MiB;
      emit('a');
      await clock.tickAsync(900);
      socket.bufferedAmount = 0;
      emit('b');
      await clock.tickAsync(900);
      socket.bufferedAmount = 11 * MiB;
      emit('c');
      await clock.tickAsync(900);
      emit('d');
      await clock.tickAsync(0);
      assert.equal(socket.close.callCount, 0);
      assert.deepEqual(socket.methods, ['a', 'b', 'c', 'd']);
    });

    it('closes the connection right away if the buffer exceeds twice the limit', async function () {
      const socket = connect({bidiMaxBufferedBytes: 10 * MiB, bidiMaxBufferedMs: 60_000});
      socket.bufferedAmount = 21 * MiB;
      emit('a');
      await setImmediate();
      assert.equal(socket.close.callCount, 1);
      assert.equal(socket.sent.length, 0);
    });

    it('does not affect other connections', async function () {
      const slow = connect({bidiMaxBufferedBytes: 10 * MiB, bidiMaxBufferedMs: 0});
      const fast = attach(appium);
      slow.bufferedAmount = 11 * MiB;
      emit('a');
      await setImmediate();
      assert.equal(slow.close.callCount, 1);
      assert.deepEqual(fast.methods, ['a']);
      emit('b');
      await setImmediate();
      assert.deepEqual(fast.methods, ['a', 'b']);
      assert.deepEqual(slow.methods, []);
      assert.equal(driver.eventEmitter.listenerCount('bidiEvent'), 1);
    });

    it('is disabled by a zero limit', async function () {
      const socket = connect({bidiMaxBufferedBytes: 0, bidiMaxBufferedMs: 0});
      socket.bufferedAmount = 1024 * MiB;
      emit('a');
      await setImmediate();
      assert.equal(socket.close.callCount, 0);
      assert.deepEqual(socket.methods, ['a']);
    });
  });

  describe('heartbeat', function () {
    it('terminates the connection that stops answering pings', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
      const socket = connect({bidiHeartbeatInterval: 1});
      await clock.tickAsync(2000);
      assert.equal(socket.ping.callCount, 2);
      assert.equal(socket.terminate.callCount, 0);
      await clock.tickAsync(1000);
      assert.equal(socket.terminate.callCount, 1);
    });

    it('keeps the connection that answers pings', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
      const socket = connect({bidiHeartbeatInterval: 1});
      for (let i = 0; i < 10; ++i) {
        await clock.tickAsync(1000);
        socket.emit('pong');
      }
      assert.equal(socket.ping.callCount, 10);
      assert.equal(socket.terminate.callCount, 0);
    });

    it('does not count missed pongs while data is queued ahead of the ping', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
      const socket = connect({bidiHeartbeatInterval: 1});
      socket.bufferedAmount = 5 * MiB;
      await clock.tickAsync(10_000);
      assert.equal(socket.ping.callCount, 0);
      assert.equal(socket.terminate.callCount, 0);
    });

    it('stops pinging a closed connection', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
      const socket = connect({bidiHeartbeatInterval: 1});
      socket.emit('close', 1000, Buffer.from(''));
      await clock.tickAsync(10_000);
      assert.equal(socket.ping.callCount, 0);
    });

    it('is disabled by a zero interval', async function () {
      const clock = sinon.useFakeTimers({toFake: ['Date', 'setInterval', 'clearInterval']});
      const socket = connect({bidiHeartbeatInterval: 0});
      await clock.tickAsync(600_000);
      assert.equal(socket.ping.callCount, 0);
    });
  });

  describe('delivery policy', function () {
    const key = (id: string) => ({policy: 'droppable' as const, chain: CHAIN, syncPoint: id.startsWith('k')});
    let signals: BiDiBackpressureEvent[];

    beforeEach(function () {
      signals = [];
      driver.eventEmitter.on('bidiBackpressure', (ev: BiDiBackpressureEvent) => signals.push(ev));
    });

    it('does not send the delivery hints to clients', async function () {
      const socket = connect();
      emit('a', key('a'));
      await setImmediate();
      assert.deepEqual(Object.keys(JSON.parse(socket.sent[0].data.toString())).sort(), [
        'context',
        'method',
        'params',
        'type',
      ]);
    });

    it('skips a chain until the next sync point and resyncs each connection on its own', async function () {
      const slow = connect();
      const fast = attach(appium);
      for (const id of ['k1', 'd2']) {
        emit(id, key(id));
      }
      await setImmediate();
      assert.deepEqual(slow.methods, ['k1', 'd2']);

      slow.bufferedAmount = 3 * MiB;
      for (const id of ['d3', 'd4']) {
        emit(id, key(id));
      }
      slow.bufferedAmount = 0;
      for (const id of ['d5', 'k6', 'd7']) {
        emit(id, key(id));
      }
      await setImmediate();
      assert.deepEqual(slow.methods, ['k1', 'd2', 'k6', 'd7']);
      assert.deepEqual(fast.methods, ['k1', 'd2', 'd3', 'd4', 'd5', 'k6', 'd7']);
    });

    it('keeps skipping while the buffer is between the resume and the soft marks', async function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('d1');
      emit('d2', {policy: 'droppable'});
      socket.bufferedAmount = 1.5 * MiB;
      emit('d3', {policy: 'droppable'});
      socket.bufferedAmount = 0.5 * MiB;
      emit('d4', {policy: 'droppable'});
      await setImmediate();
      assert.deepEqual(socket.methods, ['d1', 'd4']);
    });

    it('does not resync on a sync point while the buffer is still congested', async function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('d1', key('d1'));
      emit('k2', key('k2'));
      socket.bufferedAmount = 0;
      emit('d3', key('d3'));
      emit('k4', key('k4'));
      await setImmediate();
      assert.deepEqual(socket.methods, ['k4']);
    });

    it('does not skip events if the buffer limit is disabled', async function () {
      const socket = connect({bidiMaxBufferedBytes: 0});
      socket.bufferedAmount = 100 * MiB;
      emit('d1', key('d1'));
      await setImmediate();
      assert.deepEqual(socket.methods, ['d1']);
    });

    it('stops skipping a method the client has unsubscribed from', async function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('d1', key('d1'));
      await driver.bidiUnsubscribe([METHOD], ['']);
      emit('d2', key('d2'));
      assert.deepEqual(
        signals.map(({state}) => state),
        ['dropping', 'recovered'],
      );
    });

    it('always sends reliable events', async function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('r1', {policy: 'reliable'});
      emit('r2', undefined, 'audio');
      emit('d3', key('d3'));
      await setImmediate();
      assert.deepEqual(socket.methods, ['r1', 'r2']);
    });

    it('tracks skipped chains independently', async function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('d1', key('d1'));
      socket.bufferedAmount = 0;
      emit('d2', {policy: 'droppable', chain: 'other'});
      emit('d3', key('d3'));
      await setImmediate();
      assert.deepEqual(socket.methods, ['d2']);
    });

    it('notifies the producer when the first connection starts and the last one stops dropping', async function () {
      const slow = connect();
      const slower = attach(appium);
      slow.bufferedAmount = 3 * MiB;
      emit('d1', key('d1'));
      emit('d2', key('d2'));
      slower.bufferedAmount = 3 * MiB;
      emit('d3', key('d3'));
      assert.deepEqual(signals, [{method: METHOD, chain: CHAIN, state: 'dropping', dropped: 1}]);

      slow.bufferedAmount = 0;
      emit('k4', key('k4'));
      // the sync point is skipped for the second connection, so the producer hears about it again
      assert.deepEqual(
        signals.map(({state}) => state),
        ['dropping', 'dropping'],
      );
      slower.bufferedAmount = 0;
      emit('k5', key('k5'));
      assert.deepEqual(signals[2], {method: METHOD, chain: CHAIN, state: 'recovered', dropped: 3});
      assert.equal(signals.length, 3);
    });

    it('reports a recovery if the dropping connection goes away', function () {
      const socket = connect();
      socket.bufferedAmount = 3 * MiB;
      emit('d1', {policy: 'droppable'});
      socket.emit('close', 1000, Buffer.from(''));
      assert.deepEqual(
        signals.map(({state}) => state),
        ['dropping', 'recovered'],
      );
      assert.equal(signals[1].chain, undefined);
    });

    it('survives a failing backpressure listener', async function () {
      const socket = connect();
      driver.eventEmitter.on('bidiBackpressure', () => {
        throw new Error('boom');
      });
      socket.bufferedAmount = 3 * MiB;
      emit('d1', key('d1'));
      socket.bufferedAmount = 0;
      emit('k2', key('k2'));
      await setImmediate();
      assert.deepEqual(socket.methods, ['k2']);
    });
  });
});
