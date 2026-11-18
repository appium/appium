import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import {describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import type {ExternalDriver} from '@appium/types';
import {WebSocket} from 'ws';

import {AppiumDriver} from '../../../lib/appium.js';

class CommandSocket extends EventEmitter {
  readonly OPEN = WebSocket.OPEN;
  readonly readyState = WebSocket.OPEN;
  readonly bufferedAmount = 0;
  readonly responses: any[] = [];

  send(data: string | Buffer, _options: unknown, callback: () => void): void {
    this.responses.push(JSON.parse(data.toString()));
    callback();
  }

  async command(id: number, method: string, params: object): Promise<any> {
    this.emit('message', Buffer.from(JSON.stringify({id, method, params})));
    await setImmediate();
    return this.responses.find((r) => r.id === id);
  }

  async close(): Promise<void> {
    this.emit('close', 1000, Buffer.from(''));
    await setImmediate();
  }
}

describe('BiDi subscriptions of a connection', function () {
  function connect(appium: AppiumDriver): CommandSocket {
    const socket = new CommandSocket();
    appium.onBidiConnection(socket as unknown as WebSocket, {url: '/bidi/test'} as IncomingMessage);
    return socket;
  }

  async function withSession(
    fn: (appium: AppiumDriver, driver: BaseDriver<any, any, any, any, any>) => Promise<void>,
  ): Promise<void> {
    const appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    const driver = new BaseDriver();
    appium.sessions.test = driver as ExternalDriver;
    try {
      await fn(appium, driver);
    } finally {
      driver.eventEmitter.removeAllListeners();
    }
  }

  it('removes the subscriptions when the connection is closed', async function () {
    await withSession(async (appium, driver) => {
      const socket = connect(appium);
      assert.equal((await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']})).type, 'success');
      assert.equal((await socket.command(2, 'session.subscribe', {events: ['appium:mediaStream']})).type, 'success');
      assert.deepEqual(Object.keys(driver.bidiEventSubs).sort(), ['appium:mediaStream', 'log.entryAdded']);
      await socket.close();
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  });

  it('keeps the subscriptions of the other connections', async function () {
    await withSession(async (appium, driver) => {
      const first = connect(appium);
      const second = connect(appium);
      await first.command(1, 'session.subscribe', {events: ['log.entryAdded'], contexts: ['a']});
      await second.command(1, 'session.subscribe', {events: ['log.entryAdded'], contexts: ['b']});
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['a', 'b']});
      await first.close();
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['b']});
      await second.close();
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  });

  it('does not touch the subscriptions that were not made over the connection', async function () {
    await withSession(async (appium, driver) => {
      await driver.bidiSubscribe(['log.entryAdded']);
      const socket = connect(appium);
      await socket.command(1, 'session.subscribe', {events: ['appium:mediaStream']});
      await socket.close();
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});
    });
  });

  it('handles the subscriptions that were already removed', async function () {
    await withSession(async (appium, driver) => {
      const socket = connect(appium);
      const {result} = await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
      await socket.command(2, 'session.subscribe', {events: ['appium:mediaStream']});
      await socket.command(3, 'session.unsubscribe', {subscriptions: [result.subscription]});
      assert.deepEqual(Object.keys(driver.bidiEventSubs), ['appium:mediaStream']);
      await socket.close();
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  });

  it('does not fail if the session has already ended', async function () {
    await withSession(async (appium, driver) => {
      const socket = connect(appium);
      await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
      await driver.deleteSession();
      await socket.close();
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  });
});
