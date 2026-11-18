import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {IncomingMessage} from 'node:http';
import {describe, it} from 'node:test';
import {setImmediate} from 'node:timers/promises';

import {BaseDriver} from '@appium/base-driver';
import {BasePlugin} from '@appium/base-plugin';
import type {ExternalDriver} from '@appium/types';
import sinon from 'sinon';
import {WebSocket} from 'ws';

import {AppiumDriver} from '../../../lib/appium.js';

type AnyDriver = BaseDriver<any, any, any, any, any>;

class CommandSocket extends EventEmitter {
  readonly OPEN = WebSocket.OPEN;
  readonly readyState = WebSocket.OPEN;
  readonly bufferedAmount = 0;
  readonly responses: any[] = [];

  send(data: string | Buffer, _options: unknown, callback: () => void): void {
    this.responses.push(JSON.parse(data.toString()));
    callback();
  }

  /** Sends a command and waits for its response */
  async command(id: number, method: string, params: object): Promise<any> {
    this.post(id, method, params);
    await flush();
    return this.responses.find((r) => r.id === id);
  }

  /** Sends a command without waiting for its response */
  post(id: number, method: string, params: object): void {
    this.emit('message', Buffer.from(JSON.stringify({id, method, params})));
  }

  /** Also what `ws.close()` does for the session cleanup */
  async close(): Promise<void> {
    this.emit('close', 1000, Buffer.from(''));
    await flush();
  }
}

/** Lets the promise chains of the connection handlers settle */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await setImmediate();
  }
}

/** Records the unsubscribe commands that reach a plugin, and can fail them */
class UnsubscribePlugin extends BasePlugin {
  unsubscribed: string[][] = [];
  failure?: Error;

  async bidiUnsubscribe(next: () => Promise<unknown>, _driver: unknown, ...args: any[]): Promise<unknown> {
    this.unsubscribed.push(args[2]);
    if (this.failure) {
      throw this.failure;
    }
    return await next();
  }
}

/** Holds the subscribe commands that reach a plugin until they are released */
class SlowSubscribePlugin extends BasePlugin {
  release!: () => void;
  private readonly released = new Promise<void>((resolve) => (this.release = resolve));

  async bidiSubscribe(next: () => Promise<unknown>): Promise<unknown> {
    await this.released;
    return await next();
  }
}

describe('BiDi subscriptions of a connection', function () {
  function connect(appium: AppiumDriver): CommandSocket {
    const socket = new CommandSocket();
    appium.onBidiConnection(socket as unknown as WebSocket, {url: '/bidi/test'} as IncomingMessage);
    return socket;
  }

  async function withSession(
    fn: (appium: AppiumDriver, driver: AnyDriver) => Promise<void>,
    plugins: BasePlugin[] = [],
  ): Promise<void> {
    const appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    const driver = new BaseDriver();
    appium.sessions.test = driver as ExternalDriver;
    appium.sessionPlugins.test = plugins;
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

  it('does not unsubscribe again what the client has unsubscribed by the ID', async function () {
    const plugin = new UnsubscribePlugin('unsubscribe');
    await withSession(
      async (appium, driver) => {
        const socket = connect(appium);
        const first = (await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']})).result.subscription;
        const second = (await socket.command(2, 'session.subscribe', {events: ['appium:mediaStream']})).result
          .subscription;
        await socket.command(3, 'session.unsubscribe', {subscriptions: [first]});
        assert.deepEqual(plugin.unsubscribed, [[first]]);
        await socket.close();
        assert.deepEqual(plugin.unsubscribed, [[first], [second]]);
        assert.deepEqual(driver.bidiEventSubs, {});
      },
      [plugin],
    );
  });

  it('removes the subscriptions that were unsubscribed by the event names', async function () {
    await withSession(async (appium, driver) => {
      const socket = connect(appium);
      await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
      await socket.command(2, 'session.subscribe', {events: ['appium:mediaStream']});
      await socket.command(3, 'session.unsubscribe', {events: ['log.entryAdded']});
      assert.deepEqual(Object.keys(driver.bidiEventSubs), ['appium:mediaStream']);
      await socket.close();
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  });

  it('removes a subscription that is still being made when the connection is closed', async function () {
    const plugin = new SlowSubscribePlugin('slow');
    await withSession(
      async (appium, driver) => {
        const socket = connect(appium);
        socket.post(1, 'session.subscribe', {events: ['log.entryAdded']});
        await flush();
        await socket.close();
        assert.deepEqual(driver.bidiEventSubs, {});
        plugin.release();
        await flush();
        assert.deepEqual(driver.bidiEventSubs, {});
      },
      [plugin],
    );
  });

  it('lets the plugins handle the removal of the subscriptions', async function () {
    const plugin = new UnsubscribePlugin('unsubscribe');
    await withSession(
      async (appium, driver) => {
        const socket = connect(appium);
        const {result} = await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
        await socket.close();
        assert.deepEqual(plugin.unsubscribed, [[result.subscription]]);
        assert.deepEqual(driver.bidiEventSubs, {});
      },
      [plugin],
    );
  });

  it('logs the subscriptions that cannot be removed and still removes the others', async function () {
    const plugin = new UnsubscribePlugin('unsubscribe');
    await withSession(
      async (appium, driver) => {
        const debug = sinon.spy(driver.log, 'debug');
        const socket = connect(appium);
        await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
        await socket.command(2, 'session.subscribe', {events: ['appium:mediaStream']});
        plugin.failure = new Error('rejected by the plugin');
        await socket.close();
        assert.equal(plugin.unsubscribed.length, 2);
        assert.equal(debug.getCalls().filter((c) => /rejected by the plugin/.test(String(c.args[0]))).length, 2);
        assert.deepEqual(Object.keys(driver.bidiEventSubs).sort(), ['appium:mediaStream', 'log.entryAdded']);
      },
      [plugin],
    );
  });

  it('leaves the subscriptions to the session if its sockets are cleaned up', async function () {
    const plugin = new UnsubscribePlugin('unsubscribe');
    await withSession(
      async (appium, driver) => {
        const socket = connect(appium);
        await socket.command(1, 'session.subscribe', {events: ['log.entryAdded']});
        appium.cleanupBidiSockets('test');
        await flush();
        assert.deepEqual(plugin.unsubscribed, []);
        await driver.deleteSession();
        assert.deepEqual(driver.bidiEventSubs, {});
      },
      [plugin],
    );
  });
});
