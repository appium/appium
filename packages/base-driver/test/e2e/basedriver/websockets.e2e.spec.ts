import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import WebSocket, {WebSocketServer} from 'ws';
// `@appium/types` (not converted to ESM in this change) resolves `ws`'s `Server` type
// in CJS ("require") mode, which TS treats as a distinct type identity from this
// file's ESM-resolved `ws` types; import it the same way to match `addWebSocketHandler`'s
// parameter type.
import type {Server as WSServer} from 'ws' with {'resolution-mode': 'require'};

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
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(WS_DATA);
        }
      });
      const endpoint = `${DEFAULT_WS_PATHNAME_PREFIX}/hello`;
      const timeout = 5000;
      await baseServer.addWebSocketHandler(endpoint, wss as unknown as WSServer);
      assert.strictEqual(Object.keys(await baseServer.getWebSocketHandlers()).length, 1);
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.once('upgrade', (res) => {
          try {
            assert.strictEqual(res.statusCode, 101);
          } catch (e) {
            reject(e);
          }
        });
        client.once('message', (data) => {
          const dataStr = typeof data === 'string' ? data : data.toString();
          assert.strictEqual(dataStr, WS_DATA);
          resolve();
        });
        client.once('error', reject);
        setTimeout(() => reject(new Error('No websocket messages have been received after the timeout')), timeout);
      });

      assert.strictEqual(await baseServer.removeWebSocketHandler(endpoint), true);
      assert.strictEqual(Object.keys(await baseServer.getWebSocketHandlers()).length, 0);
      await new Promise<void>((resolve, reject) => {
        const client = new WebSocket(`ws://${TEST_HOST}:${port}${endpoint}`);
        client.on('message', (data) =>
          reject(
            new Error(
              `No websocket messages are expected after the handler ` +
                `has been removed. '${data}' is received instead. `,
            ),
          ),
        );
        client.on('error', resolve);
        setTimeout(resolve, timeout);
      });
    });
  });
});
