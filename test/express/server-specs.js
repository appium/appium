// transpile:mocha

import { server } from '../..';
import { configureServer, normalizeBasePath } from '../../lib/express/server';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';


const should = chai.should();
chai.use(chaiAsPromised);

describe('server configuration', function () {
  it('should actually use the middleware', function () {
    let app = {use: sinon.spy(), all: sinon.spy()};
    let configureRoutes = () => {};
    configureServer(app, configureRoutes);
    app.use.callCount.should.equal(16);
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
