import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {Driver, MethodMap} from '@appium/types';
import {server, routeConfiguringFunction} from '../../../lib';
import {configureServer, normalizeBasePath} from '../../../lib/express/server';
import {createSandbox} from 'sinon';
import {getTestPort} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

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
    port = await getTestPort(true);
  });

  function fakeApp() {
    const app = {
      use: sandbox.spy(),
      all: sandbox.spy(),
      get: sandbox.spy(),
      post: sandbox.spy(),
      delete: sandbox.spy(),
      totalCount: () =>
        app.use.callCount +
        app.all.callCount +
        app.get.callCount +
        app.post.callCount +
        app.delete.callCount,
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
    expect(app.use.callCount).to.equal(15);
    expect(app.all.callCount).to.equal(4);
  });

  it('should apply new methods in plugins to the standard method map', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: newMethodMap});
    expect(app2.totalCount()).to.eql(app1.totalCount() + 2);
  });

  it('should silently reject new methods in plugins if not plain objects', function () {
    const app1 = fakeApp() as any;
    const app2 = fakeApp() as any;
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver as any);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: [] as any});
    expect(app2.totalCount()).to.eql(app1.totalCount());
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
      expect((_server as any).updated).to.be.true;
    } finally {
      await _server.close();
    }
  });

  it('should reject if error thrown in configureRoutes parameter', async function () {
    const configureRoutes = () => {
      throw new Error('I am Mr. MeeSeeks look at me!');
    };
    await expect(
      server({
        routeConfiguringFunction: configureRoutes,
        port,
      })
    ).to.be.rejectedWith('MeeSeeks');
  });

  describe('#normalizeBasePath', function () {
    it('should throw an error for paths of the wrong type', function () {
      expect(() => normalizeBasePath(null as unknown as string)).to.throw();
      expect(() => normalizeBasePath(1 as unknown as string)).to.throw();
    });
    it('should remove trailing slashes', function () {
      expect(normalizeBasePath('/wd/hub/')).to.eql('/wd/hub');
      expect(normalizeBasePath('/foo/')).to.eql('/foo');
      expect(normalizeBasePath('/')).to.eql('');
    });
    it('should ensure a leading slash is present', function () {
      expect(normalizeBasePath('foo')).to.eql('/foo');
      expect(normalizeBasePath('wd/hub')).to.eql('/wd/hub');
      expect(normalizeBasePath('wd/hub/')).to.eql('/wd/hub');
    });
  });
});
