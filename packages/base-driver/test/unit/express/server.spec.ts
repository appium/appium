import assert from 'node:assert/strict';
import {afterEach, before, beforeEach, describe, it} from 'node:test';

import {getTestPort} from '@appium/driver-test-support';
import type {Driver, MethodMap} from '@appium/types';
import {createSandbox} from 'sinon';

import {configureServer, normalizeBasePath, server} from '../../../lib/express/server';
import {routeConfiguringFunction} from '../../../lib/protocol/protocol';
import {registerTestPages} from '../../../lib/test-pages';

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

  before(async function () {
    port = await getTestPort();
  });

  function fakeApp() {
    const app = {
      use: sandbox.spy(),
      all: sandbox.spy(),
      get: sandbox.spy(),
      post: sandbox.spy(),
      delete: sandbox.spy(),
      totalCount: () =>
        app.use.callCount + app.all.callCount + app.get.callCount + app.post.callCount + app.delete.callCount,
    };
    return app;
  }

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should actually use the middleware', function () {
    const app = fakeApp() as any;
    const configureRoutes = () => {};
    configureServer({app, addRoutes: configureRoutes, frontRouter: fakeFrontRouter});
    assert.strictEqual(app.use.callCount, 12);
    assert.strictEqual(app.all.callCount, 0);
  });

  it('should mount legacy test pages when registerTestPages is provided', function () {
    const app = fakeApp() as any;
    const configureRoutes = () => {};
    // @ts-expect-error registerTestPages is not normally used in this way
    configureServer({app, addRoutes: configureRoutes, frontRouter: fakeFrontRouter, registerTestPages});
    assert.strictEqual(app.use.callCount, 16);
    assert.strictEqual(app.all.callCount, 4);
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
