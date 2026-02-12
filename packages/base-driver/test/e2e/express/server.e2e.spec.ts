import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {server} from '../../../lib';
import axios from 'axios';
import {createSandbox} from 'sinon';
import B from 'bluebird';
import _ from 'lodash';
import {exec} from 'teen_process';
import https from 'node:https';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

async function generateCertificate(certPath: string, keyPath: string): Promise<void> {
  await exec('openssl', [
    'req',
    '-nodes',
    '-new',
    '-x509',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-subj',
    '/C=US/ST=State/L=City/O=company/OU=Com/CN=www.testserver.local',
  ]);
}

describe('server', function () {
  let hwServer: Awaited<ReturnType<typeof server>>;
  let port: number;
  let sandbox: sinon.SinonSandbox;

  before(async function () {
    port = await getTestPort(true);

    function configureRoutes(app: any) {
      app.get('/', (req: any, res: any) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send('Hello World!');
      });
      app.get('/python', (req: any, res: any) => {
        res.status(200).send(req.headers['content-type']);
      });
      app.get('/error', () => {
        throw new Error('hahaha');
      });
      app.get('/pause', async (req: any, res: any) => {
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
    expect(data).to.eql('Hello World!');
  });
  it('should catch errors in the catchall', async function () {
    await expect(axios.get(`http://${TEST_HOST}:${port}/error`)).to.be.rejected;
  });
  it('should error if we try to start again on a port that is used', async function () {
    await expect(
      server({
        routeConfiguringFunction() {},
        port,
      })
    ).to.be.rejectedWith(/EADDRINUSE/);
  });
  it('should not wait for the server close connections before finishing closing', async function () {
    const bodyPromise = (async () => {
      try {
        return await axios.get(`http://${TEST_HOST}:${port}/pause`);
      } catch {
        // ignore
      }
    })();

    await B.delay(100);

    const before = Date.now();
    await hwServer.close();
    expect(Date.now() - before).to.not.be.above(800);

    await bodyPromise;
  });
  it('should error if we try to start on a bad hostname', async function () {
    this.timeout(60000);
    await expect(
      server({
        routeConfiguringFunction: _.noop,
        port,
        hostname: 'lolcathost',
      })
    ).to.be.rejectedWith(/ENOTFOUND|EADDRNOTAVAIL|EAI_AGAIN/);
    await expect(
      server({
        routeConfiguringFunction: _.noop,
        port,
        hostname: '1.1.1.1',
      })
    ).to.be.rejectedWith(/EADDRNOTAVAIL/);
  });
});

describe('tls server', function () {
  let hwServer: Awaited<ReturnType<typeof server>>;
  let port: number;
  const certPath = 'certificate.cert';
  const keyPath = 'certificate.key';
  const looseClient = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  before(async function () {
    try {
      await generateCertificate(certPath, keyPath);
    } catch (e) {
      if (process.env.CI) {
        throw e;
      }
      return this.skip();
    }

    port = await getTestPort(true);

    function configureRoutes(app: any) {
      app.get('/', (req: any, res: any) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send('Hello World!');
      });
    }

    hwServer = await server({
      routeConfiguringFunction: configureRoutes,
      cliArgs: {
        sslCertificatePath: certPath,
        sslKeyPath: keyPath,
      } as any,
      port,
    });
  });

  after(async function () {
    await hwServer.close();
  });

  it('should start up with our middleware', async function () {
    const {data} = await looseClient.get(`https://${TEST_HOST}:${port}/`);
    expect(data).to.eql('Hello World!');
  });
  it('should throw if untrusted', async function () {
    await expect(axios.get(`https://${TEST_HOST}:${port}/`)).to.eventually.be.rejected;
  });
  it('should throw if not secure', async function () {
    await expect(axios.get(`http://${TEST_HOST}:${port}/`)).to.eventually.be.rejected;
  });
});

type ServerWithPlugins = Awaited<ReturnType<typeof server>> & {
  _updated_plugin1?: boolean;
  _updated_plugin2?: boolean;
};

describe('server plugins', function () {
  let hwServer: ServerWithPlugins;
  let port: number;

  before(async function () {
    port = await getTestPort(true);
  });

  afterEach(async function () {
    try {
      await hwServer?.close();
    } catch {
      // ignore
    }
  });

  function updaterWithGetRoute(route: string, reply: string) {
    return async (app: any, httpServer: ServerWithPlugins) => {
      app.get(`/${route}`, (req: any, res: any) => {
        res.header['content-type'] = 'text/html';
        res.status(200).send(reply);
      });
      (httpServer as any)[`_updated_${route}`] = true;
    };
  }

  it('should allow one or more plugins to update the server', async function () {
    hwServer = (await server({
      routeConfiguringFunction: _.noop,
      port,
      serverUpdaters: [
        updaterWithGetRoute('plugin1', 'res from plugin1 route'),
        updaterWithGetRoute('plugin2', 'res from plugin2 route'),
      ],
    })) as ServerWithPlugins;
    let {data} = await axios.get(`http://${TEST_HOST}:${port}/plugin1`);
    expect(data).to.eql('res from plugin1 route');
    ({data} = await axios.get(`http://${TEST_HOST}:${port}/plugin2`));
    expect(data).to.eql('res from plugin2 route');
    expect(hwServer._updated_plugin1).to.be.true;
    expect(hwServer._updated_plugin2).to.be.true;
  });
  it('should pass on errors from the plugin updateServer method', async function () {
    await expect(
      server({
        routeConfiguringFunction: _.noop,
        port,
        serverUpdaters: [
          () => {
            throw new Error('ugh');
          },
        ],
      })
    ).to.eventually.be.rejectedWith(/ugh/);
  });
});
