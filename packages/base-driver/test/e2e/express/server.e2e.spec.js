// transpile:mocha

import {server} from '../../../lib';
import axios from 'axios';
import {createSandbox} from 'sinon';
import B from 'bluebird';
import _ from 'lodash';
import {TEST_HOST, getTestPort} from '@appium/test-support';

describe('server', function () {
  let hwServer;
  let port;
  let sandbox;
  before(async function () {
    port = await getTestPort(true);

    function configureRoutes(app) {
      app.get('/', (req, res) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send('Hello World!');
      });
      app.get('/python', (req, res) => {
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
      port,
    });
  });
  beforeEach(function () {
    sandbox = createSandbox();
    sandbox.stub(console, 'error');
  });
  after(async function () {
    await hwServer.close();
  });
  afterEach(function () {
    sandbox.restore();
  });

  it('should start up with our middleware', async function () {
    const {data} = await axios.get(`http://${TEST_HOST}:${port}/`);
    data.should.eql('Hello World!');
  });
  it('should fix broken context type', async function () {
    const {data} = await axios({
      url: `http://${TEST_HOST}:${port}/python`,
      headers: {
        'user-agent': 'Python',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    data.should.eql('application/json; charset=utf-8');
  });
  it('should catch errors in the catchall', async function () {
    await axios.get(`http://${TEST_HOST}:${port}/error`).should.be.rejected;
  });
  it('should error if we try to start again on a port that is used', async function () {
    await server({
      routeConfiguringFunction() {},
      port,
    }).should.be.rejectedWith(/EADDRINUSE/);
  });
  it('should not wait for the server close connections before finishing closing', async function () {
    let bodyPromise = axios.get(`http://${TEST_HOST}:${port}/pause`).catch(() => {});

    // relinquish control so that we don't close before the request is received
    await B.delay(100);

    let before = Date.now();
    await hwServer.close();
    // expect slightly less than the request waited, since we paused above
    (Date.now() - before).should.not.be.above(800);

    await bodyPromise;
  });
  it('should error if we try to start on a bad hostname', async function () {
    this.timeout(60000);
    await server({
      routeConfiguringFunction: _.noop,
      port,
      hostname: 'lolcathost',
    }).should.be.rejectedWith(/ENOTFOUND|EADDRNOTAVAIL|EAI_AGAIN/);
    await server({
      routeConfiguringFunction: _.noop,
      port,
      hostname: '1.1.1.1',
    }).should.be.rejectedWith(/EADDRNOTAVAIL/);
  });
});

describe('server plugins', function () {
  let hwServer;
  let port;

  before(async function () {
    port = await getTestPort(true);
  });

  afterEach(async function () {
    try {
      await hwServer.close();
    } catch (ign) {}
  });

  function updaterWithGetRoute(route, reply) {
    // eslint-disable-next-line require-await
    return async (app, httpServer) => {
      app.get(`/${route}`, (req, res) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send(reply);
      });
      httpServer[`_updated_${route}`] = true;
    };
  }

  it('should allow one or more plugins to update the server', async function () {
    hwServer = await server({
      routeConfiguringFunction: _.noop,
      port,
      serverUpdaters: [
        updaterWithGetRoute('plugin1', 'res from plugin1 route'),
        updaterWithGetRoute('plugin2', 'res from plugin2 route'),
      ],
    });
    let {data} = await axios.get(`http://${TEST_HOST}:${port}/plugin1`);
    data.should.eql('res from plugin1 route');
    ({data} = await axios.get(`http://${TEST_HOST}:${port}/plugin2`));
    data.should.eql('res from plugin2 route');
    hwServer._updated_plugin1.should.be.true;
    hwServer._updated_plugin2.should.be.true;
  });
  it('should pass on errors from the plugin updateServer method', async function () {
    await server({
      routeConfiguringFunction: _.noop,
      port,
      serverUpdaters: [
        () => {
          throw new Error('ugh');
        },
      ],
    }).should.eventually.be.rejectedWith(/ugh/);
  });
});
