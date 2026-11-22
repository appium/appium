import assert from 'node:assert/strict';
import http from 'node:http';
import type net from 'node:net';
import {after, before, beforeEach, describe, it} from 'node:test';

import {configureHttp} from '../../lib/server.js';

const WS_PATH = '/session/abc/bidi';

interface FakeWSServer {
  upgraded: boolean;
  rawSocket: net.Socket | null;
  handleUpgrade(req: unknown, socket: unknown, head: unknown, cb: (ws: unknown) => void): void;
  emit(...args: unknown[]): void;
}

function makeFakeWSServer(): FakeWSServer {
  return {
    upgraded: false,
    rawSocket: null,
    handleUpgrade(_req, socket, _head, cb) {
      // an upgraded socket is detached from the HTTP server's connection
      // tracking, so remember it for teardown
      this.rawSocket = socket as net.Socket;
      this.upgraded = true;
      cb({});
    },
    emit() {},
  };
}

describe('configureHttp Host validation on native WebSocket upgrades', function () {
  let httpServer: http.Server;
  let port = 0;
  let wsServer: FakeWSServer;

  before(async function () {
    // the native upgrade listener is only attached when shouldUpgradeCallback is
    // available; seed the property so this spec exercises the native path on
    // every supported Node (on older versions the property is inert and the
    // 'upgrade' event fires as usual)
    wsServer = makeFakeWSServer();
    httpServer = http.createServer(() => {});
    httpServer.on('clientError', (_err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    (
      httpServer as unknown as {shouldUpgradeCallback?: (req: http.IncomingMessage) => boolean}
    ).shouldUpgradeCallback = (req) => String(req.headers?.upgrade ?? '').toLowerCase() === 'websocket';
    const appiumServer = configureHttp({
      httpServer: httpServer as never,
      basePath: '/',
      reject: () => {},
      allowCors: true,
      keepAliveTimeout: 1000,
      gracefulShutdownTimeout: 5000,
      denyForeignHosts: true,
      allowedHostnames: [],
    }) as unknown as {webSocketsMapping: Record<string, unknown>};
    appiumServer.webSocketsMapping[WS_PATH] = wsServer as never;
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    port = (httpServer.address() as net.AddressInfo).port;
  });

  after(async function () {
    // the accepted upgrade leaves a live socket detached from the HTTP server's
    // connection tracking, which would keep close() waiting forever
    wsServer.rawSocket?.destroy();
    httpServer.closeAllConnections();
    await Promise.race([
      new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(resolve, 250)),
    ]);
  });

  beforeEach(function () {
    wsServer.upgraded = false;
  });

  function upgrade(host: string): Promise<{status: number | undefined; body: string}> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: WS_PATH,
        headers: {host, connection: 'Upgrade', upgrade: 'websocket'},
      });
      req.end();
      req.on('upgrade', () => reject(new Error('the upgrade should not proceed')));
      req.on('response', (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += String(chunk);
        });
        res.on('end', () => resolve({status: res.statusCode, body}));
      });
      req.on('error', reject);
    });
  }

  it('should reject a WebSocket upgrade with a foreign Host before the handler runs', async function () {
    const {status, body} = await upgrade('evil.example');
    assert.strictEqual(status, 403);
    assert.strictEqual(wsServer.upgraded, false);
    assert.ok(body.includes('Invalid Host header'));
  });

  it('should reject a malformed bracketed Host before the handler runs', async function () {
    const {status} = await upgrade('[::1]evil.example');
    assert.strictEqual(status, 403);
    assert.strictEqual(wsServer.upgraded, false);
  });

  it('should allow a WebSocket upgrade with an IP-literal Host', async function () {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: WS_PATH,
      headers: {host: '127.0.0.1', connection: 'Upgrade', upgrade: 'websocket'},
    });
    req.on('error', () => {});
    req.end();
    // the fake handler accepts the upgrade; wait for the flag
    const deadline = Date.now() + 2000;
    while (!wsServer.upgraded && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    req.destroy();
    assert.strictEqual(wsServer.upgraded, true);
  });
});
