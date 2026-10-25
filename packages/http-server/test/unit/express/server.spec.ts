import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {errors, routeConfiguringFunction, WebDriverProxy} from '@appium/base-driver';
import {getTestPort} from '@appium/driver-test-support';
import type {Driver, MethodMap} from '@appium/types';
import express from 'express';
import {createSandbox} from 'sinon';

import {configureServer, normalizeBasePath, server} from '../../../lib/server.js';

// stand-in for the router `configureHttp` normally creates
const fakeFrontRouter = {} as any;

const newMethodMap = {
  '/session/:sessionId/fake': {
    GET: {command: 'fakeGet'},
    POST: {command: 'fakePost', payloadParams: {required: ['fakeParam']}},
  },
} as MethodMap<Driver>;

const updateServer = async (app: any, httpServer: any) => {
  app.updated = true;
  httpServer.updated = true;
};

function fakeDriver() {
  return {sessionExists: () => true, executeCommand: () => {}};
}

describe('server configuration', function () {
  let port: number;
  let sandbox: sinon.SinonSandbox;

  function fakeApp() {
    const app = {
      use: sandbox.spy(),
      all: sandbox.spy(),
      get: sandbox.spy(),
      head: sandbox.spy(),
      post: sandbox.spy(),
      delete: sandbox.spy(),
      totalCount: () =>
        app.use.callCount + app.all.callCount + app.get.callCount + app.post.callCount + app.delete.callCount,
    };
    return app;
  }

  beforeEach(async function () {
    // Do not reuse a fetch connection from a server closed by the previous test.
    port = await getTestPort();
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  for (const basePath of ['', '/wd/hub']) {
    it(`should reject implicit HEAD commands under '${basePath}' without executing the driver`, async function () {
      const driver = fakeDriver();
      const execute = sandbox.spy(driver, 'executeCommand');
      const exists = sandbox.spy(driver, 'sessionExists');
      const _server = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver as any),
        port,
        basePath,
        extraMethodMap: newMethodMap,
      });
      try {
        const cases = [
          ['/status', 'GET'],
          ['/session/foo/url', 'GET, POST'],
          ['/session/missing/title', 'GET'],
          ['/session/foo/fake', 'GET, POST'],
        ];
        for (const [path, allowedMethods] of cases) {
          const res = await fetch(`http://127.0.0.1:${port}${basePath}${path}`, {method: 'HEAD'});
          assert.strictEqual(res.status, 405, path);
          assert.strictEqual(res.headers.get('allow'), allowedMethods, path);
          assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8', path);
          assert.strictEqual(await res.text(), '', 'HEAD responses must not contain a body');
          assert.strictEqual(res.headers.get('cache-control'), 'no-cache');
        }
        assert.strictEqual(execute.callCount, 0);
        assert.strictEqual(exists.callCount, 0, 'method validation must precede session validation');
        const unknown = await fetch(`http://127.0.0.1:${port}${basePath}/unknown`, {method: 'HEAD'});
        assert.strictEqual(unknown.status, 404);
        const get = await fetch(`http://127.0.0.1:${port}${basePath}/status`);
        assert.strictEqual(get.status, 200);
        await get.text();
        assert.strictEqual(execute.callCount, 1);
      } finally {
        await _server.close();
      }
    });
  }

  it('should preserve explicit extension HEAD commands and custom server routes', async function () {
    const execute = sandbox.stub().resolves({});
    const driver = {...fakeDriver(), executeCommand: execute, proxyActive: () => false};
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
      extraMethodMap: {
        '/session/:sessionId/explicit-head': {
          GET: {command: 'fakeGet'},
          HEAD: {command: 'fakeHead'},
        },
      } as MethodMap<Driver>,
      serverUpdaters: [
        async (app) => {
          app.get('/health', (_req, res) => res.sendStatus(204));
        },
      ],
    });
    try {
      const explicit = await fetch(`http://127.0.0.1:${port}/session/foo/explicit-head`, {method: 'HEAD'});
      assert.strictEqual(explicit.status, 200);
      assert.strictEqual(await explicit.text(), '');
      assert.strictEqual(execute.firstCall.args[0], 'fakeHead');
      const custom = await fetch(`http://127.0.0.1:${port}/health`, {method: 'HEAD'});
      assert.strictEqual(custom.status, 204);
      assert.strictEqual(execute.callCount, 1);
    } finally {
      await _server.close();
    }
  });

  it('should set no-cache on successful responses and errors from each HTTP layer', async function () {
    const driver = {sessionExists: () => false, executeCommand: () => ({ready: true})};
    const _server = await server({
      routeConfiguringFunction(app, opts) {
        routeConfiguringFunction(driver as any)(app, opts);
        app.get('/uncaught-error', () => {
          throw new Error('HTTP handler failed');
        });
      },
      port,
    });
    try {
      const cases: [string, RequestInit, number][] = [
        ['/status', {}, 200],
        ['/unknown', {}, 404],
        ['/session/missing/title', {}, 404],
        ['/uncaught-error', {}, 500],
        ['/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{'}, 400],
      ];
      for (const [path, init, status] of cases) {
        const headers = new Headers(init.headers);
        headers.set('connection', 'close');
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {...init, headers});
        assert.strictEqual(res.status, status, path);
        assert.strictEqual(res.headers.get('cache-control'), 'no-cache', path);
        await res.json();
      }
    } finally {
      await _server.close();
    }
  });

  for (const status of [200, 404]) {
    it(`should set no-cache on a proxied ${status} response`, async function () {
      const proxy = new WebDriverProxy();
      const proxyCommand = sandbox.stub(proxy, 'proxyCommand');
      const value =
        status === 200
          ? 'Page title'
          : {
              error: 'no such window',
              message: 'Window closed',
              stacktrace: 'downstream stack',
            };
      if (status === 200) {
        proxyCommand.resolves([{statusCode: status, headers: {'cache-control': 'public, max-age=60'}} as any, {value}]);
      } else {
        proxyCommand.rejects(new errors.ProxyRequestError('Proxy failed', {value}, status));
      }
      const driver = {
        sessionExists: () => true,
        proxyActive: () => true,
        canProxy: () => true,
        proxyRouteIsAvoided: () => false,
        executeCommand: (_command: string, req: any, res: any) => proxy.proxyReqRes(req, res),
      };
      const _server = await server({routeConfiguringFunction: routeConfiguringFunction(driver as any), port});
      try {
        const res = await fetch(`http://127.0.0.1:${port}/session/test/title`, {headers: {connection: 'close'}});
        assert.strictEqual(res.status, status);
        assert.strictEqual(res.headers.get('cache-control'), 'no-cache');
        assert.deepStrictEqual(await res.json(), {value});
        assert.strictEqual(proxyCommand.calledOnce, true);
      } finally {
        await _server.close();
      }
    });
  }

  it('should actually use the middleware', function () {
    const app = fakeApp() as any;
    const configureRoutes = () => {};
    configureServer({app, addRoutes: configureRoutes, frontRouter: fakeFrontRouter});
    assert.strictEqual(app.use.callCount, 13);
    assert.strictEqual(app.all.callCount, 0);
  });

  it('should apply new methods in plugins to the standard method map', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes, frontRouter: fakeFrontRouter});
    configureServer({app: app2, addRoutes, frontRouter: fakeFrontRouter, extraMethodMap: newMethodMap});
    assert.strictEqual(app2.totalCount(), app1.totalCount() + 2);
  });

  it('should silently reject new methods in plugins if not plain objects', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes, frontRouter: fakeFrontRouter});
    configureServer({app: app2, addRoutes, frontRouter: fakeFrontRouter, extraMethodMap: [] as any});
    assert.strictEqual(app2.totalCount(), app1.totalCount());
  });

  it('should mount the front router before routes are registered', function () {
    const callOrder: string[] = [];
    const app = fakeApp() as any;
    app.use = sandbox.spy((mw: any) => {
      if (mw === fakeFrontRouter) {
        callOrder.push('frontRouter');
      }
    });
    const configureRoutes = () => callOrder.push('route');
    configureServer({app, addRoutes: configureRoutes, frontRouter: fakeFrontRouter});
    assert.deepStrictEqual(callOrder, ['frontRouter', 'route']);
  });

  it('should let updateServer intercept requests to routes Appium owns via httpServer.frontRouter', async function () {
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    // reaches httpServer.frontRouter from the existing updateServer hook
    const interceptingUpdater = async (_app: any, httpServer: any) => {
      httpServer.frontRouter.use((_req: any, res: any, next: any) => {
        res.set('x-pre-server', 'true');
        next();
      });
    };
    const _server = await server({
      routeConfiguringFunction: addRoutes,
      port,
      serverUpdaters: [interceptingUpdater],
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/status`);
      assert.strictEqual(res.headers.get('x-pre-server'), 'true');
      await res.json();
    } finally {
      await _server.close();
    }
  });

  it('should allow plugins to update the server', async function () {
    const driver = fakeDriver();
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
      extraMethodMap: newMethodMap,
      serverUpdaters: [updateServer],
    });
    try {
      assert.strictEqual((_server as any).updated, true);
    } finally {
      await _server.close();
    }
  });

  it('should return unknown method for an extension command url called with the wrong method', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      basePath: '/wd/hub',
      extraMethodMap: newMethodMap,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/wd/hub/session/foo/fake`, {method: 'DELETE'});
      assert.strictEqual(res.status, 405);
      assert.strictEqual(((await res.json()) as any).value.error, 'unknown method');

      const resWithoutBasePath = await fetch(`http://127.0.0.1:${port}/session/foo/fake`, {method: 'DELETE'});
      assert.strictEqual(resWithoutBasePath.status, 404);
      assert.strictEqual(((await resWithoutBasePath.json()) as any).value.error, 'unknown command');
    } finally {
      await _server.close();
    }
  });

  it('should reject HEAD on a post-only command without a body', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/session`, {method: 'HEAD'});
      assert.strictEqual(res.status, 405);
      assert.strictEqual(res.headers.get('allow'), 'POST');
      assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
      assert.strictEqual(await res.text(), '');
    } finally {
      await _server.close();
    }
  });

  it('should let updateServer add a method on a known command url', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.put('/status', (_req: any, res: any) => {
            res.sendStatus(204);
          });
        },
      ],
    });
    try {
      const put = await fetch(`http://127.0.0.1:${port}/status`, {method: 'PUT'});
      assert.strictEqual(put.status, 204);
      assert.strictEqual(await put.text(), '');

      const post = await fetch(`http://127.0.0.1:${port}/status`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(post.status, 405);
      assert.strictEqual(((await post.json()) as any).value.error, 'unknown method');
    } finally {
      await _server.close();
    }
  });

  it('should respond with a W3C error when the request body is not valid JSON', async function () {
    const driver = fakeDriver();
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/session`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: '{"capabilities": not valid json}',
      });
      assert.equal(res.status, 400);
      assert.match(res.headers.get('content-type') ?? '', /application\/json/);
      assert.equal(((await res.json()) as any).value.error, 'invalid argument');
    } finally {
      await _server.close();
    }
  });

  it('should report an unknown command when the JSON body cannot be parsed', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/no-such`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      assert.strictEqual(res.status, 404);
      assert.match(res.headers.get('content-type') ?? '', /application\/json/);
      assert.strictEqual(((await res.json()) as any).value.error, 'unknown command');
    } finally {
      await _server.close();
    }
  });

  it('should report an invalid session id when the JSON body cannot be parsed', async function () {
    const driver = {sessionExists: () => false, executeCommand: () => {}};
    const execute = sandbox.spy(driver, 'executeCommand');
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/session/missing/url`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(((await res.json()) as any).value.error, 'invalid session id');
      assert.strictEqual(execute.callCount, 0);
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON for a session command when the session exists', async function () {
    const driver = fakeDriver();
    const execute = sandbox.spy(driver, 'executeCommand');
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/session/foo/url`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      const body = (await res.json()) as any;
      assert.strictEqual(res.status, 400);
      assert.strictEqual(body.value.error, 'invalid argument');
      assert.match(body.value.message, /not valid JSON/);
      assert.strictEqual(execute.callCount, 0);
    } finally {
      await _server.close();
    }
  });

  it('should not proxy a session command whose JSON body cannot be parsed', async function () {
    const proxy = new WebDriverProxy();
    const proxyCommand = sandbox.stub(proxy, 'proxyCommand');
    const driver = {
      sessionExists: () => true,
      proxyActive: () => true,
      canProxy: () => true,
      proxyRouteIsAvoided: () => false,
      executeCommand: (_command: string, req: any, res: any) => proxy.proxyReqRes(req, res),
    };
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver as any),
      port,
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/session/test/url`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(((await res.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(proxyCommand.called, false);
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON for an extension route before its handler runs', async function () {
    let extensionCalls = 0;
    let frontCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app, httpServer) => {
          app.post('/extension', (_req: any, res: any) => {
            extensionCalls += 1;
            res.send('ok');
          });
          httpServer.frontRouter.post('/front', (_req: any, res: any) => {
            frontCalls += 1;
            res.send('front');
          });
        },
      ],
    });
    try {
      const badExtension = await fetch(`http://127.0.0.1:${port}/extension`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      assert.strictEqual(badExtension.status, 400);
      assert.strictEqual(((await badExtension.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(extensionCalls, 0);

      const badFront = await fetch(`http://127.0.0.1:${port}/front`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badFront.status, 400);
      assert.strictEqual(((await badFront.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(frontCalls, 0);

      const extension = await fetch(`http://127.0.0.1:${port}/extension`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(extension.status, 200);
      assert.strictEqual(await extension.text(), 'ok');
      assert.strictEqual(extensionCalls, 1);

      const unknown = await fetch(`http://127.0.0.1:${port}/no-such`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(unknown.status, 404);
      assert.strictEqual(((await unknown.json()) as any).value.error, 'unknown command');
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON for an extension route registered with app.all', async function () {
    let pluginCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.all('/plugin', (_req: any, res: any) => {
            pluginCalls += 1;
            res.send('plugin');
          });
        },
      ],
    });
    try {
      const badPlugin = await fetch(`http://127.0.0.1:${port}/plugin`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badPlugin.status, 400);
      assert.strictEqual(((await badPlugin.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(pluginCalls, 0);

      const plugin = await fetch(`http://127.0.0.1:${port}/plugin`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(plugin.status, 200);
      assert.strictEqual(await plugin.text(), 'plugin');
      assert.strictEqual(pluginCalls, 1);
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON for an extension route registered with propfind', async function () {
    let directCalls = 0;
    let mountedCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.propfind('/direct', (_req: any, res: any) => {
            directCalls += 1;
            res.send('direct');
          });
          const router = express.Router();
          router.propfind('/item', (_req, res) => {
            mountedCalls += 1;
            res.send('mounted');
          });
          app.use('/mounted', router);
        },
      ],
    });
    try {
      const badDirect = await fetch(`http://127.0.0.1:${port}/direct`, {
        method: 'PROPFIND',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badDirect.status, 400);
      assert.strictEqual(((await badDirect.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(directCalls, 0);

      const badMounted = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'PROPFIND',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badMounted.status, 400);
      assert.strictEqual(((await badMounted.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(mountedCalls, 0);

      const direct = await fetch(`http://127.0.0.1:${port}/direct`, {
        method: 'PROPFIND',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(direct.status, 200);
      assert.strictEqual(await direct.text(), 'direct');
      assert.strictEqual(directCalls, 1);

      const mounted = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'PROPFIND',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(mounted.status, 200);
      assert.strictEqual(await mounted.text(), 'mounted');
      assert.strictEqual(mountedCalls, 1);

      const unknown = await fetch(`http://127.0.0.1:${port}/direct`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(unknown.status, 404);
      assert.strictEqual(((await unknown.json()) as any).value.error, 'unknown command');
    } finally {
      await _server.close();
    }
  });

  it('should report an unknown command for a bad JSON body under a mounted router', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          const router = express.Router();
          router.post('/item', (_req, res) => {
            res.send('item');
          });
          app.use('/mounted', router);
        },
      ],
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/mounted/missing`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{"url": not json}',
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(((await res.json()) as any).value.error, 'unknown command');
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON for a matching route on a mounted router before its handler runs', async function () {
    let itemCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          const router = express.Router();
          router.post('/item', (_req, res) => {
            itemCalls += 1;
            res.send('item');
          });
          app.use('/mounted', router);
        },
      ],
    });
    try {
      const badItem = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badItem.status, 400);
      assert.strictEqual(((await badItem.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(itemCalls, 0);

      const item = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(item.status, 200);
      assert.strictEqual(await item.text(), 'item');
      assert.strictEqual(itemCalls, 1);
    } finally {
      await _server.close();
    }
  });

  it('should not run extension middleware when the JSON body cannot be parsed', async function () {
    let routerUseCalls = 0;
    let frontUseCalls = 0;
    let soloCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app, httpServer) => {
          httpServer.frontRouter.use((_req: any, _res: any, next: any) => {
            frontUseCalls += 1;
            next();
          });
          app.use('/solo', (_req: any, res: any) => {
            soloCalls += 1;
            res.send('solo');
          });
          const router = express.Router();
          router.use((_req, res) => {
            routerUseCalls += 1;
            res.send('from-use');
          });
          router.post('/item', (_req, res) => {
            res.send('item');
          });
          app.use('/mounted', router);
        },
      ],
    });
    try {
      const badItem = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badItem.status, 400);
      assert.strictEqual(((await badItem.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(routerUseCalls, 0);

      const missing = await fetch(`http://127.0.0.1:${port}/mounted/missing`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(missing.status, 404);
      assert.strictEqual(((await missing.json()) as any).value.error, 'unknown command');
      assert.strictEqual(routerUseCalls, 0);

      const badSolo = await fetch(`http://127.0.0.1:${port}/solo`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badSolo.status, 400);
      assert.strictEqual(((await badSolo.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(soloCalls, 0);

      const unknown = await fetch(`http://127.0.0.1:${port}/no-such`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(unknown.status, 404);
      assert.strictEqual(((await unknown.json()) as any).value.error, 'unknown command');
      assert.strictEqual(frontUseCalls, 0);

      const solo = await fetch(`http://127.0.0.1:${port}/solo`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(solo.status, 200);
      assert.strictEqual(await solo.text(), 'solo');
      assert.strictEqual(soloCalls, 1);
      assert.strictEqual(frontUseCalls, 1);

      const item = await fetch(`http://127.0.0.1:${port}/mounted/item`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(item.status, 200);
      assert.strictEqual(await item.text(), 'from-use');
      assert.strictEqual(routerUseCalls, 1);
    } finally {
      await _server.close();
    }
  });

  it('should reject invalid JSON before an extension param callback runs', async function () {
    let appParamCalls = 0;
    let routerParamCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.param('itemId', (_req: any, res: any) => {
            appParamCalls += 1;
            res.send('from-param');
          });
          app.post('/items/:itemId', (_req: any, res: any) => {
            res.send('item');
          });
          const router = express.Router();
          router.param('itemId', (_req, res) => {
            routerParamCalls += 1;
            res.send('from-param');
          });
          router.post('/:itemId', (_req, res) => {
            res.send('mounted');
          });
          app.use('/mounted', router);
        },
      ],
    });
    try {
      const badApp = await fetch(`http://127.0.0.1:${port}/items/1`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badApp.status, 400);
      assert.strictEqual(((await badApp.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(appParamCalls, 0);

      const badRouter = await fetch(`http://127.0.0.1:${port}/mounted/1`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badRouter.status, 400);
      assert.strictEqual(((await badRouter.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(routerParamCalls, 0);

      const appItem = await fetch(`http://127.0.0.1:${port}/items/1`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(appItem.status, 200);
      assert.strictEqual(await appItem.text(), 'from-param');
      assert.strictEqual(appParamCalls, 1);

      const mounted = await fetch(`http://127.0.0.1:${port}/mounted/1`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(mounted.status, 200);
      assert.strictEqual(await mounted.text(), 'from-param');
      assert.strictEqual(routerParamCalls, 1);
    } finally {
      await _server.close();
    }
  });

  it('should report an unknown command for a bad JSON body under a param mount', async function () {
    let paramCalls = 0;
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.param('id', (_req: any, res: any) => {
            paramCalls += 1;
            res.send('from-param');
          });
          const router = express.Router();
          router.post('/ok', (_req, res) => {
            res.send('ok');
          });
          app.use('/custom/:id', router);
        },
      ],
    });
    try {
      const missing = await fetch(`http://127.0.0.1:${port}/custom/123/missing`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(missing.status, 404);
      assert.strictEqual(((await missing.json()) as any).value.error, 'unknown command');
      assert.strictEqual(paramCalls, 0);

      const badOk = await fetch(`http://127.0.0.1:${port}/custom/123/ok`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{',
      });
      assert.strictEqual(badOk.status, 400);
      assert.strictEqual(((await badOk.json()) as any).value.error, 'invalid argument');
      assert.strictEqual(paramCalls, 0);

      const ok = await fetch(`http://127.0.0.1:${port}/custom/123/ok`, {
        method: 'POST',
        headers: {'content-type': 'application/json', connection: 'close'},
        body: '{}',
      });
      assert.strictEqual(ok.status, 200);
      assert.strictEqual(await ok.text(), 'from-param');
      assert.strictEqual(paramCalls, 1);
    } finally {
      await _server.close();
    }
  });

  for (const basePath of ['', '/wd/hub']) {
    it(`should return W3C errors for unknown paths with basePath '${basePath}'`, async function () {
      const _server = await server({
        routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
        port,
        basePath,
      });
      try {
        for (const route of ['/', '/unknown', `${basePath}/unknown/nested`]) {
          const res = await fetch(`http://127.0.0.1:${port}${route}`);
          assert.strictEqual(res.status, 404, route);
          assert.match(res.headers.get('content-type') ?? '', /application\/json/);
          assert.strictEqual(((await res.json()) as any).value.error, 'unknown command');
        }
        const status = await fetch(`http://127.0.0.1:${port}${basePath}/status`);
        assert.strictEqual(status.status, 200);
        await status.json();
      } finally {
        await _server.close();
      }
    });
  }

  it('should preserve a root route registered by a server updater', async function () {
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(fakeDriver() as any),
      port,
      serverUpdaters: [
        async (app) => {
          app.get('/', (_req, res) => res.send('extension root'));
        },
      ],
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(await res.text(), 'extension root');
    } finally {
      await _server.close();
    }
  });

  it('should reject if error thrown in configureRoutes parameter', async function () {
    const configureRoutes = () => {
      throw new Error('I am Mr. MeeSeeks look at me!');
    };
    await assert.rejects(
      server({
        routeConfiguringFunction: configureRoutes,
        port,
      }),
      /MeeSeeks/,
    );
  });

  describe('#normalizeBasePath', function () {
    it('should throw an error for paths of the wrong type', function () {
      assert.throws(() => normalizeBasePath(null as unknown as string));
      assert.throws(() => normalizeBasePath(1 as unknown as string));
    });
    it('should remove trailing slashes', function () {
      assert.strictEqual(normalizeBasePath('/wd/hub/'), '/wd/hub');
      assert.strictEqual(normalizeBasePath('/foo/'), '/foo');
      assert.strictEqual(normalizeBasePath('/'), '');
    });
    it('should ensure a leading slash is present', function () {
      assert.strictEqual(normalizeBasePath('foo'), '/foo');
      assert.strictEqual(normalizeBasePath('wd/hub'), '/wd/hub');
      assert.strictEqual(normalizeBasePath('wd/hub/'), '/wd/hub');
    });
  });
});
