import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {AppiumServer, WSServer} from '@appium/types';
import type {Express, Request, Response} from 'express';

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
