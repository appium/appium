import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {describe, it} from 'node:test';

import {fs, tempDir} from '@appium/support';
import type {AppiumServer, WSServer} from '@appium/types';
import type {Express, Request, Response} from 'express';
import sinon from 'sinon';
import WebSocket from 'ws';

import {StoragePlugin} from '../../lib/plugin.js';

interface CapturedResponse {
  status: number;
  body: any;
}

/**
 * Registers the plugin routes against a stub app and returns a function which invokes the
 * handler bound to `routePath` with the given request body.
 */
async function routeCaller(
  routePath: string,
  basePath = '',
  httpServer = {basePath} as AppiumServer,
): Promise<(body: unknown) => Promise<CapturedResponse>> {
  const routes: Record<string, (req: Request, res: Response) => Promise<void>> = {};
  const register = (path: string, handler: (req: Request, res: Response) => Promise<void>) => {
    routes[path] = handler;
  };
  const app = {post: register, get: register} as unknown as Express;
  await StoragePlugin.updateServer(app, httpServer);
  const handler = routes[routePath];
  assert.ok(handler, `No handler was registered for ${routePath}`);

  return async function callRoute(body: unknown): Promise<CapturedResponse> {
    const captured: CapturedResponse = {status: 0, body: undefined};
    const res = {
      set: () => res,
      status: (code: number) => {
        captured.status = code;
        return res;
      },
      send: (payload: any) => {
        captured.body = payload;
        return res;
      },
    } as unknown as Response;
    await handler({body} as Request, res);
    return captured;
  };
}

describe('StoragePlugin routes', function () {
  for (const sha1 of ['['.repeat(40), '/'.repeat(40), 'g'.repeat(40), Array(40).fill('a')]) {
    it(`should reject invalid SHA1 input ${JSON.stringify(sha1)} before mounting sockets`, async function () {
      const server = makeServer();
      const callRoute = await routeCaller('/appium/storage/add', '', server);
      const {status, body} = await callRoute({name: 'test.apk', sha1});
      assert.equal(status, 400);
      assert.equal(body.value.error, 'invalid argument');
      assert.equal(server.registrations, 0);
    });
  }
  for (const concurrent of [false, true]) {
    it(`should reuse sockets for ${concurrent ? 'concurrent' : 'retried'} upload requests`, async function () {
      const server = makeServer();
      const callRoute = await routeCaller('/appium/storage/add', '', server);
      const opts = {name: 'test.apk', sha1: 'a'.repeat(40)};
      try {
        let first: CapturedResponse;
        let second: CapturedResponse;
        if (concurrent) {
          [first, second] = await Promise.all([callRoute(opts), callRoute(opts)]);
        } else {
          first = await callRoute(opts);
          second = await callRoute(opts);
        }
        assert.equal(first.status, 200);
        assert.deepEqual(first, second);
        assert.equal(server.registrations, 2);
        assert.equal(server.removals, 0);
      } finally {
        await closeSockets(server);
      }
    });
  }

  // Match Java Client's upload sequence without requiring Java or starting Appium.
  // https://github.com/appium/java-client/blob/f8e328bffbaca38e59762eb0cb793eff38a34ca1/src/main/java/io/appium/java_client/plugins/storage/StorageClient.java
  it('should support Java Client uploads and retries for identical content under different names', async function (t) {
    const signal = AbortSignal.any([t.signal, AbortSignal.timeout(4000)]);
    const server = makeServer();
    const http = createServer();
    const clients: WebSocket[] = [];
    const root = await tempDir.openDir();
    const previousRoot = process.env.APPIUM_STORAGE_ROOT;
    const previousKeepAll = process.env.APPIUM_STORAGE_KEEP_ALL;
    process.env.APPIUM_STORAGE_ROOT = root;
    process.env.APPIUM_STORAGE_KEEP_ALL = 'false';
    http.on('upgrade', (req, socket, head) => {
      const handler = server.webSocketsMapping[req.url!];
      if (!handler) {
        socket.destroy();
        return;
      }
      handler.handleUpgrade(req, socket, head, (ws) => handler.emit('connection', ws, req));
    });
    try {
      http.listen(0, '127.0.0.1');
      await once(http, 'listening', {signal});
      const address = http.address();
      assert.ok(address && typeof address !== 'string');
      const list = await routeCaller('/appium/storage/list', '', server);
      // Initialize the storage directory before exercising the upload routes.
      assert.deepEqual((await list({})).body.value, []);
      const callRoute = await routeCaller('/appium/storage/add', '', server);
      // Exercise multiple full 65535-byte chunks and a final partial chunk.
      const content = Buffer.alloc(131071);
      for (let i = 0; i < content.length; i++) {
        content[i] = i % 251;
      }
      const sha1 = createHash('sha1').update(content).digest('hex');
      const first = await callRoute({name: 'a.apk', sha1});
      const second = await callRoute({name: 'b.apk', sha1});
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.notDeepEqual(first.body.value.ws, second.body.value.ws, 'different names need separate endpoints');
      assert.ok(first.body.value.ttlMs > 0);
      const connect = async (path: string): Promise<WebSocket> => {
        // Use the returned path verbatim; the upload ID's hash algorithm is irrelevant to clients.
        const client = new WebSocket(`ws://127.0.0.1:${address.port}${path}`);
        clients.push(client);
        // Keep termination during cleanup safe even if the open wait was aborted.
        client.on('error', () => {});
        await once(client, 'open', {signal});
        return client;
      };
      const observer = await connect(first.body.value.ws.events);
      const observedStatus = once(observer, 'message', {signal});
      // Handle cancellation while the uploads are still in progress.
      void observedStatus.catch(() => {});
      for (const [name, response] of [
        ['a.apk', first],
        ['b.apk', second],
      ] as const) {
        const retry = await callRoute({name, sha1});
        assert.deepEqual(retry, response);
        // Java opens stream before events, sends chunks, then closes stream before awaiting success.
        const stream = await connect(retry.body.value.ws.stream);
        const events = await connect(retry.body.value.ws.events);
        const status = once(events, 'message', {signal});
        void status.catch(() => {});
        for (let offset = 0; offset < content.length; offset += 65535) {
          await new Promise<void>((resolve, reject) => {
            stream.send(content.subarray(offset, offset + 65535), (error) => (error ? reject(error) : resolve()));
          });
        }
        stream.close();
        const [message] = await status;
        assert.deepEqual(JSON.parse(message.toString()).value, {success: true, name, sha1});
      }
      const [observedMessage] = await observedStatus;
      assert.deepEqual(JSON.parse(observedMessage.toString()).value, {success: true, name: 'a.apk', sha1});
      const items = (await list({})).body.value;
      assert.deepEqual(items.map((item: {name: string}) => item.name).sort(), ['a.apk', 'b.apk']);
      for (const item of items) {
        assert.equal(item.size, content.length);
        assert.deepEqual(await fs.readFile(item.path), content);
      }
      const deleteItem = await routeCaller('/appium/storage/delete', '', server);
      assert.equal((await deleteItem({name: 'a.apk'})).body.value, true);
      assert.equal((await deleteItem({name: 'a.apk'})).body.value, false);
      assert.equal((await list({})).body.value.length, 1);
      const reset = await routeCaller('/appium/storage/reset', '', server);
      assert.equal((await reset({})).status, 200);
      assert.deepEqual((await list({})).body.value, []);
    } finally {
      for (const client of clients) {
        client.terminate();
      }
      await closeSockets(server);
      await new Promise<void>((resolve) => http.close(() => resolve()));
      if (previousRoot === undefined) {
        delete process.env.APPIUM_STORAGE_ROOT;
      } else {
        process.env.APPIUM_STORAGE_ROOT = previousRoot;
      }
      if (previousKeepAll === undefined) {
        delete process.env.APPIUM_STORAGE_KEEP_ALL;
      } else {
        process.env.APPIUM_STORAGE_KEEP_ALL = previousKeepAll;
      }
      await fs.rimraf(root);
    }
  });

  it('should renew the full advertised lifetime without replacing retry sockets', async function () {
    const clock = sinon.useFakeTimers({now: 1, toFake: ['setTimeout', 'clearTimeout']});
    const now = sinon.stub(performance, 'now').callsFake(() => clock.now);
    const server = makeServer();
    try {
      const callRoute = await routeCaller('/appium/storage/add', '', server);
      const opts = {name: 'retry.apk', sha1: 'c'.repeat(40)};
      const first = await callRoute(opts);
      const ttl = first.body.value.ttlMs;
      const handlers = {...server.webSocketsMapping};
      await clock.tickAsync(ttl - 1000);
      const retry = await callRoute(opts);
      assert.deepEqual(retry, first);
      await clock.tickAsync(1001);
      assert.deepEqual(server.webSocketsMapping, handlers);
      assert.equal(server.removals, 0);
      assert.equal(server.registrations, 2);
      await clock.tickAsync(ttl - 1002);
      assert.deepEqual(server.webSocketsMapping, handlers);
      await clock.tickAsync(3);
      assert.deepEqual(server.webSocketsMapping, {});
      assert.equal(server.removals, 2);
    } finally {
      await closeSockets(server);
      await clock.tickAsync(100);
      now.restore();
      clock.restore();
    }
  });

  it('should keep uploads on different route prefixes and servers independent', async function () {
    const firstServer = makeServer();
    const secondServer = makeServer();
    const opts = {name: 'test.apk', sha1: 'b'.repeat(40)};
    try {
      for (const server of [firstServer, secondServer]) {
        for (const prefix of ['/appium/storage', '/storage']) {
          const callRoute = await routeCaller(`${prefix}/add`, '', server);
          assert.equal((await callRoute(opts)).status, 200);
        }
      }
      assert.equal(firstServer.registrations, 4);
      assert.equal(secondServer.registrations, 4);
      assert.equal(firstServer.removals, 0);
      assert.equal(secondServer.removals, 0);
    } finally {
      await closeSockets(firstServer);
      await closeSockets(secondServer);
    }
  });
  it('should reject an invalid add name as an invalid argument', async function () {
    const callRoute = await routeCaller('/appium/storage/add');
    const {status, body} = await callRoute({
      name: 'foo/bar',
      sha1: 'ccc963411b2621335657963322890305ebe96186',
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.value.error, 'invalid argument');
  });

  it('should mount the routes under the server base path', async function () {
    const callRoute = await routeCaller('/wd/hub/appium/storage/add', '/wd/hub');
    const {status} = await callRoute({name: 'foo/bar', sha1: 'ccc963411b2621335657963322890305ebe96186'});
    assert.strictEqual(status, 400);
    await assert.rejects(routeCaller('/appium/storage/add', '/wd/hub'));
  });
});

function makeServer(): AppiumServer & {registrations: number; removals: number} {
  const mapping: Record<string, WSServer> = {};
  const server = {
    basePath: '',
    webSocketsMapping: mapping,
    registrations: 0,
    removals: 0,
    async getWebSocketHandlers(path: string) {
      return Object.fromEntries(Object.entries(mapping).filter(([key]) => key.includes(path)));
    },
    async addWebSocketHandler(path: string, handler: WSServer) {
      server.registrations++;
      mapping[path] = handler;
    },
    async removeWebSocketHandler(path: string) {
      server.removals++;
      mapping[path]?.close();
      delete mapping[path];
      return true;
    },
  };
  return server as unknown as AppiumServer & {registrations: number; removals: number};
}

async function closeSockets(server: AppiumServer): Promise<void> {
  for (const path of Object.keys(server.webSocketsMapping)) {
    await server.removeWebSocketHandler(path);
  }
}
