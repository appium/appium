// transpile:mocha

import { server, routeConfiguringFunction } from '../../index.js';
import { configureServer, normalizeBasePath } from '../../lib/express/server';
import sinon from 'sinon';
import getPort from 'get-port';

function fakeApp () {
  const app = {
    use: sinon.spy(),
    all: sinon.spy(),
    get: sinon.spy(),
    post: sinon.spy(),
    delete: sinon.spy(),
    totalCount: () => (
      app.use.callCount + app.all.callCount + app.get.callCount + app.post.callCount +
      app.delete.callCount
    )
  };
  return app;
}

const newMethodMap = {
  '/session/:sessionId/fake': {
    GET: {command: 'fakeGet'},
    POST: {command: 'fakePost', payloadParams: {required: ['fakeParam']}}
  },
};

const updateServer = (app, httpServer) => {
  app.updated = true;
  httpServer.updated = true;
};

function fakeDriver () {
  return {sessionExists: () => {}, executeCommand: () => {}};
}

describe('server configuration', function () {
  it('should actually use the middleware', function () {
    const app = fakeApp();
    const configureRoutes = () => {};
    configureServer({app, addRoutes: configureRoutes});
    app.use.callCount.should.equal(14);
    app.all.callCount.should.equal(4);
  });

  it('should apply new methods in plugins to the standard method map', function () {
    const app1 = fakeApp();
    const app2 = fakeApp();
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: newMethodMap});
    app2.totalCount().should.eql(app1.totalCount() + 2);
  });

  it('should silently reject new methods in plugins if not plain objects', function () {
    const app1 = fakeApp();
    const app2 = fakeApp();
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver);
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, extraMethodMap: []});
    app2.totalCount().should.eql(app1.totalCount());
  });

  it('should allow plugins to update the server', async function () {
    const driver = fakeDriver();
    const port = await getPort();
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port,
      extraMethodMap: newMethodMap,
      serverUpdaters: [updateServer]
    });
    try {
      _server.updated.should.be.true;
    } finally {
      await _server.close();
    }
  });

  it('should reject if error thrown in configureRoutes parameter', async function () {
    const configureRoutes = () => {
      throw new Error('I am Mr. MeeSeeks look at me!');
    };
    const port = await getPort();
    await server({
      routeConfiguringFunction: configureRoutes,
      port,
    }).should.be.rejectedWith('MeeSeeks');
  });

  describe('#normalizeBasePath', function () {
    it('should throw an error for paths of the wrong type', function () {
      should.throw(() => {
        normalizeBasePath(null);
      });
      should.throw(() => {
        normalizeBasePath(1);
      });
    });
    it('should remove trailing slashes', function () {
      normalizeBasePath('/wd/hub/').should.eql('/wd/hub');
      normalizeBasePath('/foo/').should.eql('/foo');
      normalizeBasePath('/').should.eql('');
    });
    it('should ensure a leading slash is present', function () {
      normalizeBasePath('foo').should.eql('/foo');
      normalizeBasePath('wd/hub').should.eql('/wd/hub');
      normalizeBasePath('wd/hub/').should.eql('/wd/hub');
    });
  });
});
