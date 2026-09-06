import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {AppiumServer} from '@appium/types';
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
async function routeCaller(routePath: string): Promise<(body: unknown) => Promise<CapturedResponse>> {
  const routes: Record<string, (req: Request, res: Response) => Promise<void>> = {};
  const register = (path: string, handler: (req: Request, res: Response) => Promise<void>) => {
    routes[path] = handler;
  };
  const app = {post: register, get: register} as unknown as Express;
  // every request below is rejected before the websocket setup runs, so this never gets touched
  await StoragePlugin.updateServer(app, {} as unknown as AppiumServer);
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
  describe('delete', function () {
    it('should reject a name which is not a valid file name', async function () {
      const callRoute = await routeCaller('/appium/storage/delete');
      const {status, body} = await callRoute({name: 'foo/bar'});
      assert.strictEqual(status, 400);
      assert.strictEqual(body.value.error, 'invalid argument');
    });

    it('should reject a request body without a name', async function () {
      const callRoute = await routeCaller('/appium/storage/delete');
      const {status, body} = await callRoute({});
      assert.strictEqual(status, 400);
      assert.strictEqual(body.value.error, 'invalid argument');
    });

    it('should still report a valid name which is not in the storage', async function () {
      const callRoute = await routeCaller('/appium/storage/delete');
      const {status, body} = await callRoute({name: 'missing.txt'});
      assert.strictEqual(status, 200);
      assert.strictEqual(body.value, false);
    });
  });

  describe('add', function () {
    it('should reject a name which is not a valid file name', async function () {
      const callRoute = await routeCaller('/appium/storage/add');
      const {status, body} = await callRoute({
        name: 'foo/bar',
        sha1: 'ccc963411b2621335657963322890305ebe96186',
      });
      assert.strictEqual(status, 400);
      assert.strictEqual(body.value.error, 'invalid argument');
    });
  });
});
