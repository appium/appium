// transpile:mocha

import { server } from '../..';
import { configureServer } from '../../lib/express/server';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';


chai.should();
chai.use(chaiAsPromised);

describe('server configuration', function () {
  it('should actually use the middleware', function () {
    let app = {use: sinon.spy(), all: sinon.spy()};
    let configureRoutes = () => {};
    configureServer(app, configureRoutes);
    app.use.callCount.should.equal(15);
    app.all.callCount.should.equal(4);
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
});
