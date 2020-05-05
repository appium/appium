// transpile:mocha

import { server } from '../..';
import axios from 'axios';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import B from 'bluebird';
import _ from 'lodash';

chai.should();
chai.use(chaiAsPromised);

describe('server', function () {
  let hwServer;
  let errorStub;
  before(async function () {
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
    hwServer = await server({
      routeConfiguringFunction: configureRoutes,
      port: 8181,
    });
  });
  after(async function () {
    await hwServer.close();
    errorStub.restore();
  });

  it('should start up with our middleware', async function () {
    const {data} = await axios.get('http://localhost:8181/');
    data.should.eql('Hello World!');
  });
  it('should fix broken context type', async function () {
    const {data} = await axios({
      url: 'http://localhost:8181/wd/hub/python',
      headers: {
        'user-agent': 'Python',
        'content-type': 'application/x-www-form-urlencoded'
      }
    });
    data.should.eql('application/json; charset=utf-8');
  });
  it('should catch errors in the catchall', async function () {
    await axios.get('http://localhost:8181/error').should.be.rejected;
  });
  it('should error if we try to start again on a port that is used', async function () {
    await server({
      routeConfiguringFunction () {},
      port: 8181,
    }).should.be.rejectedWith(/EADDRINUSE/);
  });
  it('should wait for the server close connections before finishing closing', async function () {
    let bodyPromise = axios.get('http://localhost:8181/pause');

    // relinquish control so that we don't close before the request is received
    await B.delay(100);

    let before = Date.now();
    await hwServer.close();
    // expect slightly less than the request waited, since we paused above
    (Date.now() - before).should.be.above(800);

    (await bodyPromise).data.should.equal('We have waited!');
  });
  it('should error if we try to start on a bad hostname', async function () {
    this.timeout(60000);
    await server({
      routeConfiguringFunction: _.noop,
      port: 8181,
      hostname: 'lolcathost',
    }).should.be.rejectedWith(/ENOTFOUND|EADDRNOTAVAIL/);
    await server({
      routeConfiguringFunction: _.noop,
      port: 8181,
      hostname: '1.1.1.1',
    }).should.be.rejectedWith(/EADDRNOTAVAIL/);
  });
});
