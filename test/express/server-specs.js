// transpile:mocha

import { server } from '../..';
import { configureServer } from '../../lib/express/server';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import B from 'bluebird';
import _ from 'lodash';


chai.should();
chai.use(chaiAsPromised);

describe('server configuration', () => {
  it('should actually use the middleware', () => {
    let app = {use: sinon.spy(), all: sinon.spy()};
    let configureRoutes = () => {};
    configureServer(app, configureRoutes);
    app.use.callCount.should.equal(15);
    app.all.callCount.should.equal(3);
  });

  it('should reject if error thrown in configureRoutes parameter', async () => {
    let configureRoutes = () => {
      throw new Error('I am Mr. MeeSeeks look at me!');
    };
    await server(configureRoutes, 8181).should.be.rejectedWith('MeeSeeks');
  });
});
describe('server', () => {
  let hwServer;
  let errorStub;
  before(async () => {
    errorStub = sinon.stub(console, 'error');
    function configureRoutes (app) {
      app.get('/', (req, res) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send('Hello World!');
      });
      app.get('/wd/hub/python', (req, res) => {
        res.status(200).send(req.headers['content-type']);
      });
      app.get('/error', () => {
        throw new Error('hahaha');
      });
      app.get('/pause', async (req, res) => {
        res.header['content-type'] = 'text/html';
        await B.delay(1000);
        res.status(200).send('We have waited!');
      });
    }
    hwServer = await server(configureRoutes, 8181);
  });
  after(async () => {
    await hwServer.close();
    errorStub.restore();
  });

  it('should start up with our middleware', async () => {
    let body = await request('http://localhost:8181/');
    body.should.eql('Hello World!');
  });
  it('should fix broken context type', async () => {
    let body = await request({
      url: 'http://localhost:8181/wd/hub/python',
      headers: {
        'user-agent': 'Python',
        'content-type': 'application/x-www-form-urlencoded'
      }
    });
    body.should.eql('application/json');
  });
  it('should catch errors in the catchall', async () => {
    await request('http://localhost:8181/error')
      .should.be.rejectedWith(/hahaha/);
  });
  it('should error if we try to start again on a port that is used', async () => {
    await server(() => {}, 8181).should.be.rejectedWith(/EADDRINUSE/);
  });
  it('should error if we try to start on a bad hostname', async () => {
    await server(_.noop, 8181, 'lolcathost').should.be.rejectedWith(/ENOTFOUND|EADDRNOTAVAIL/);
    await server(_.noop, 8181, '1.1.1.1').should.be.rejectedWith(/EADDRNOTAVAIL/);
  });
  it('should wait for the server close connections before finishing closing', async () => {
    let bodyPromise = request('http://localhost:8181/pause');

    // relinquish control so that we don't close before the request is received
    await B.delay(100);

    let before = Date.now();
    await hwServer.close();
    // expect slightly less than the request waited, since we paused above
    (Date.now() - before).should.be.above(900);

    (await bodyPromise).should.equal('We have waited!');
  });
});
