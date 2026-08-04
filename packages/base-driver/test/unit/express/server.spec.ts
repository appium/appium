import assert from 'node:assert/strict';
import {afterEach, before, beforeEach, describe, it} from 'node:test';

import {getTestPort} from '@appium/driver-test-support';
import type {Driver, MethodMap} from '@appium/types';
import {createSandbox} from 'sinon';

import {configureServer, normalizeBasePath, server} from '../../../lib/express/server';
import {routeConfiguringFunction} from '../../../lib/protocol/protocol';
import {registerTestPages} from '../../../lib/test-pages';

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
    configureServer({app, addRoutes: configureRoutes});
    assert.strictEqual(app.use.callCount, 11);
    assert.strictEqual(app.all.callCount, 0);
  });

  it('should mount legacy test pages when registerTestPages is provided', function () {
    const app = fakeApp() as any;
    const configureRoutes = () => {};
    // @ts-expect-error registerTestPages is not normally used in this way
    configureServer({app, addRoutes: configureRoutes, registerTestPages});
    assert.strictEqual(app.use.callCount, 15);
    assert.strictEqual(app.all.callCount, 4);
  });

  it('should apply new methods in plugins to the standard method map', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: newMethodMap});
    assert.strictEqual(app2.totalCount(), app1.totalCount() + 2);
  });

  it('should silently reject new methods in plugins if not plain objects', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: [] as any});
    assert.strictEqual(app2.totalCount(), app1.totalCount());
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
