import {SslHandler, server} from '../../../lib';
import axios from 'axios';
import {createSandbox} from 'sinon';
import B from 'bluebird';
import _ from 'lodash';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';
import {given} from 'mocha-testdata';
import {promisify} from 'util';

const exec = promisify(require('child_process').exec);

let givens = [{protocol: 'http'}, {protocol: 'https'}];

async function startHttpsServer(port, routeConfiguringFunction, serverUpdaters = []) {
  await exec('openssl genrsa 2048 > private.pem');
  await exec(
    'openssl req -x509 -days 1000 -new -key private.pem -out public.pem -subj /CN="sslhandler.test.com"/OU="Appium"/O="Appium"/C=US/'
  );
  process.env.APPIUM_SECURE = 'true';
  process.env.APPIUM_SSL_CERT_PATH = 'public.pem';
  process.env.APPIUM_SSL_KEY_PATH = 'private.pem';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  return await server({
    routeConfiguringFunction,
    port,
    serverUpdaters,
  });
}

describe('server', function () {
  let httpHwServer;
  let httpPort;
  let httpsPort;
  let httpsHwServer;
  let sandbox;
  before(async function () {
    httpPort = await getTestPort(true);

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
    httpHwServer = await server({
      routeConfiguringFunction: configureRoutes,
      port: httpPort,
    });
    httpsPort = await getTestPort(true);
    SslHandler.instance = null;
    httpsHwServer = await startHttpsServer(httpsPort, configureRoutes);
  });
  beforeEach(function () {
    sandbox = createSandbox();
    sandbox.stub(console, 'error');
  });
  after(async function () {
    await httpHwServer.close();
    await httpsHwServer.close();
  });
  afterEach(function () {
    sandbox.restore();
  });

  given(givens).it('should start up with our middleware', async function ({protocol}) {
    const correctPort = protocol === 'http' ? httpPort : httpsPort;
    const {data} = await axios.get(`${protocol}://${TEST_HOST}:${correctPort}/`);
    data.should.eql('Hello World!');
  });
  given(givens).it('should fix broken context type', async function ({protocol}) {
    const correctPort = protocol === 'http' ? httpPort : httpsPort;
    const {data} = await axios({
      url: `${protocol}://${TEST_HOST}:${correctPort}/python`,
      headers: {
        'user-agent': 'Python',
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    data.should.eql('application/json; charset=utf-8');
  });
  given(givens).it('should catch errors in the catchall', async function ({protocol}) {
    const correctPort = protocol === 'http' ? httpPort : httpsPort;
    await axios.get(`${protocol}://${TEST_HOST}:${correctPort}/error`).should.be.rejected;
  });
  given(givens).it(
    'should error if we try to start again on a port that is used',
    async function () {
      await server({
        routeConfiguringFunction() {},
        port: httpPort,
      }).should.be.rejectedWith(/EADDRINUSE/);
    }
  );
  given(givens).it(
    'should not wait for the server close connections before finishing closing',
    async function ({protocol}) {
      const correctPort = protocol === 'http' ? httpPort : httpsPort;
      let bodyPromise = axios
        .get(`${protocol}://${TEST_HOST}:${correctPort}/pause`)
        .catch(() => {});

      // relinquish control so that we don't close before the request is received
      await B.delay(100);

      let before = Date.now();
      await httpHwServer.close();
      await httpsHwServer.close();
      // expect slightly less than the request waited, since we paused above
      (Date.now() - before).should.not.be.above(800);

      await bodyPromise;
    }
  );
  it('should error if we try to start on a bad hostname', async function () {
    this.timeout(60000);
    await server({
      routeConfiguringFunction: _.noop,
      port: httpPort,
      hostname: 'lolcathost',
    }).should.be.rejectedWith(/ENOTFOUND|EADDRNOTAVAIL|EAI_AGAIN/);
    await server({
      routeConfiguringFunction: _.noop,
      port: httpPort,
      hostname: '1.1.1.1',
    }).should.be.rejectedWith(/EADDRNOTAVAIL/);
  });
});

describe('server plugins', function () {
  let httpHwServer;
  let httpsHwServer;
  let httpPort;
  let httpsPort;

  before(async function () {
    httpPort = await getTestPort(true);
    httpsPort = await getTestPort(true);
  });

  beforeEach(async function () {
    delete process.env.APPIUM_SECURE;
    delete process.env.APPIUM_SSL_CERT_PATH;
    delete process.env.APPIUM_SSL_KEY_PATH;
    SslHandler.instance = null;
  });

  afterEach(async function () {
    try {
      //await httpHwServer.close();
      await httpsHwServer.close();
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
  given(givens).it(
    'should allow one or more plugins to update the server',
    async function ({protocol}) {
      let correctPort;
      if (protocol === 'http') {
        correctPort = httpPort;
        httpHwServer = await server({
          routeConfiguringFunction: _.noop,
          port: correctPort,
          serverUpdaters: [
            updaterWithGetRoute('plugin1', 'res from plugin1 route'),
            updaterWithGetRoute('plugin2', 'res from plugin2 route'),
          ],
        });
      } else {
        correctPort = httpsPort;
        httpsHwServer = await startHttpsServer(httpsPort, _.noop, [
          updaterWithGetRoute('plugin1', 'res from plugin1 route'),
          updaterWithGetRoute('plugin2', 'res from plugin2 route'),
        ]);
      }
      let {data} = await axios.get(`${protocol}://${TEST_HOST}:${correctPort}/plugin1`);
      data.should.eql('res from plugin1 route');
      ({data} = await axios.get(`${protocol}://${TEST_HOST}:${correctPort}/plugin2`));
      data.should.eql('res from plugin2 route');
      const correctServer = protocol === 'http' ? httpHwServer : httpsHwServer;
      correctServer._updated_plugin1.should.be.true;
      correctServer._updated_plugin2.should.be.true;
    }
  );
  given(givens).it(
    'should pass on errors from the plugin updateServer method',
    async function ({protocol}) {
      const correctPort = protocol === 'http' ? httpPort : httpsPort;
      await server({
        routeConfiguringFunction: _.noop,
        port: correctPort,
        serverUpdaters: [
          () => {
            throw new Error('ugh');
          },
        ],
      }).should.eventually.be.rejectedWith(/ugh/);
    }
  );
});
