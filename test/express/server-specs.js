// transpile:mocha

import { server, routeConfiguringFunction } from '../..';
import { configureServer, normalizeBasePath } from '../../lib/express/server';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';


const should = chai.should();
chai.use(chaiAsPromised);

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

function fakePlugin () {
  return {
    name: 'fake',
    newMethodMap: {
      '/session/:sessionId/fake': {
        GET: {command: 'fakeGet'},
        POST: {command: 'fakePost', payloadParams: {required: ['fakeParam']}}
      },
    },
    updatesServer: true,
    updateServer: (app, httpServer) => {
      app.updated = true;
      httpServer.updated = true;
    }
  };
}

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
    configureServer({app: app2, addRoutes, plugins: [fakePlugin()]});
    app2.totalCount().should.eql(app1.totalCount() + 2);
  });

  it('should silently reject new methods in plugins if not plain objects', function () {
    const app1 = fakeApp();
    const app2 = fakeApp();
    const driver = fakeDriver();
    const addRoutes = routeConfiguringFunction(driver);
    const plugin = fakePlugin();
    plugin.newMethodMap = [];
    configureServer({app: app1, addRoutes});
    configureServer({app: app2, addRoutes, plugins: [plugin]});
    app2.totalCount().should.eql(app1.totalCount());
  });

  it('should allow plugins to update the server', async function () {
    const plugins = [fakePlugin()];
    const driver = fakeDriver();
    const _server = await server({
      routeConfiguringFunction: routeConfiguringFunction(driver),
      port: 8181,
      plugins,
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
    await server({
      routeConfiguringFunction: configureRoutes,
      port: 8181,
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
