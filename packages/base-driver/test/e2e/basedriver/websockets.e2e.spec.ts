import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import {WebSocketServer} from 'ws';

import {DEFAULT_WS_PATHNAME_PREFIX, routeConfiguringFunction, server} from '../../../lib/index.js';
import {FakeDriver} from '../protocol/fake-driver.js';

describe('Websockets (e2e)', function () {
  let baseServer: Awaited<ReturnType<typeof server>>;
  let driver: FakeDriver;
  let port: number;
  const SESSION_ID = 'foo';
  const WS_DATA = 'Hello';

  before(async function () {
    driver = new FakeDriver();
    driver.sessionId = SESSION_ID;
    port = await getTestPort();
    baseServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port,
    });
  });

  after(async function () {
    await baseServer.close();
  });

  describe('web sockets support', function () {
    it('should be able to add websocket handler and remove it', async function () {
      const wss = new WebSocketServer({
        noServer: true,
      });
      wss.on('connection', (ws) => {
        if (ws && ws.readyState === ws.OPEN) {
          ws.send(WS_DATA);
        }
      });
      const endpoint = `${DEFAULT_WS_PATHNAME_PREFIX}/hello`;
      const timeout = 5000;
      await baseServer.addWebSocketHandler(endpoint, wss);
      assert.strictEqual(Object.keys(await baseServer.getWebSocketHandlers()).length, 1);
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.addEventListener(
          'message',
          (event) => {
            const dataStr = typeof event.data === 'string' ? event.data : event.data.toString();
            assert.strictEqual(dataStr, WS_DATA);
            resolve();
          },
          {once: true},
        );
        client.addEventListener('error', () => reject(new Error('WebSocket connection error')), {once: true});
        setTimeout(() => reject(new Error('No websocket messages have been received after the timeout')), timeout);
      });

      assert.strictEqual(await baseServer.removeWebSocketHandler(endpoint), true);
      assert.strictEqual(Object.keys(await baseServer.getWebSocketHandlers()).length, 0);
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.addEventListener('message', (event) =>
          reject(
            new Error(
              `No websocket messages are expected after the handler ` +
                `has been removed. '${event.data}' is received instead. `,
            ),
          ),
        );
        client.addEventListener('error', () => resolve());
        setTimeout(resolve, timeout);
      });
    });
  });
});
