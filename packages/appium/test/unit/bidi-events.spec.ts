import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import {describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import type {ExternalDriver} from '@appium/types';
import WebSocket from 'ws';

import {AppiumDriver} from '../../lib/appium.js';

class EventSocket extends EventEmitter {
  readonly OPEN = WebSocket.OPEN;
  readonly readyState = WebSocket.OPEN;
  readonly messages: string[] = [];

  send(data: string, callback: () => void): void {
    this.messages.push(data);
    callback();
  }
}

describe('BiDi event delivery', function () {
  const cases: Array<{events: string[]; contexts?: string[]; context?: string; received: number}> = [
    {events: ['log.entryAdded'], context: 'a', received: 1},
    {events: ['log.entryAdded'], contexts: ['a'], context: 'a', received: 1},
    {events: ['log.entryAdded'], contexts: ['a'], context: 'b', received: 0},
    {events: ['log.entryAdded'], contexts: ['a'], received: 0},
    {events: ['log'], context: 'a', received: 1},
    {events: ['log'], received: 1},
    {events: ['log'], contexts: ['a'], context: 'a', received: 1},
    {events: ['log'], contexts: ['a'], context: 'b', received: 0},
    {events: ['logger'], context: 'a', received: 0},
    {events: ['log.entryAdded', 'log'], context: 'a', received: 1},
  ];

  for (const source of ['driver', 'plugin']) {
    for (const {events, contexts, context, received} of cases) {
      it(`delivers ${source} events for ${JSON.stringify({events, contexts, context})}`, async function () {
        const appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
        const driver = new BaseDriver();
        const plugin = new BasePlugin('events');
        const socket = new EventSocket();
        appium.sessions.test = driver as ExternalDriver;
        appium.sessionPlugins.test = [plugin];
        try {
          appium.onBidiConnection(socket as unknown as WebSocket, {url: '/bidi/test'} as IncomingMessage);
          await driver.bidiSubscribe(events, contexts);
          const emitter = source === 'driver' ? driver.eventEmitter : plugin.eventEmitter;
          const event = {method: 'log.entryAdded', context, params: {text: 'test'}};
          emitter.emit('bidiEvent', event);
          await setImmediate();
          assert.equal(socket.messages.length, received);
          if (received) {
            assert.equal(JSON.parse(socket.messages[0]).method, event.method);
          }

          await driver.bidiUnsubscribe(events, contexts ?? ['']);
          emitter.emit('bidiEvent', event);
          await setImmediate();
          assert.equal(socket.messages.length, received);
        } finally {
          driver.eventEmitter.removeAllListeners();
          plugin.eventEmitter.removeAllListeners();
          socket.removeAllListeners();
        }
      });
    }
  }
});
