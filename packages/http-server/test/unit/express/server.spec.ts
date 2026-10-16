import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {errors, routeConfiguringFunction, WebDriverProxy} from '@appium/base-driver';
import {getTestPort} from '@appium/driver-test-support';
import type {Driver, MethodMap} from '@appium/types';
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
