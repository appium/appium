import type {AppiumServer, DriverClass} from '@appium/types';
import type {ParsedArgs} from 'appium/types';
import type {Browser} from 'webdriverio';
import {BaseDriver} from '@appium/base-driver';
import {exec} from 'teen_process';
import {fs, tempDir} from '@appium/support';
import axios from 'axios';
import B from 'bluebird';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {createSandbox} from 'sinon';
import type {SinonSandbox} from 'sinon';
import {remote as wdio} from 'webdriverio';
import {runExtensionCommand} from '../../lib/cli/extension';
import {DRIVER_TYPE} from '../../lib/constants';
import {loadExtensions} from '../../lib/extension';
import {INSTALL_TYPE_LOCAL} from '../../lib/extension/extension-config';
import {main as appiumServer} from '../../lib/main';
import {removeAppiumPrefixes} from '../../lib/utils';
import {
  FAKE_DRIVER_DIR,
  getTestPort,
  TEST_FAKE_APP,
  TEST_HOST,
  W3C_PREFIXED_CAPS,
} from '../helpers';

const {expect} = chai;
chai.use(chaiAsPromised);

let testServerBaseUrl: string;
let port: number;

const sillyWebServerPort = 1234;
const sillyWebServerHost = 'hey';
const FAKE_ARGS = {sillyWebServerPort, sillyWebServerHost};
const FAKE_DRIVER_ARGS = {driver: {fake: FAKE_ARGS}};
const shouldStartServer = process.env.USE_RUNNING_SERVER !== '0';
const caps = W3C_PREFIXED_CAPS;

const wdOpts: { hostname: string; port?: number; connectionRetryCount?: number; capabilities?: object; path?: string; protocol?: string; strictSSL?: boolean } = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
};

async function initFakeDriver(appiumHome: string) {
  const {driverConfig} = await loadExtensions(appiumHome);
  const driverList = await runExtensionCommand(
    {
      driverCommand: 'list',
      subcommand: DRIVER_TYPE,
      suppressOutput: true,
      showInstalled: true,
    },
    driverConfig,
  );
  if (!_.has(driverList, 'fake')) {
    await runExtensionCommand(
      {
        driverCommand: 'install',
        driver: FAKE_DRIVER_DIR,
        installType: INSTALL_TYPE_LOCAL,
        subcommand: DRIVER_TYPE,
      },
      driverConfig,
    );
  }

  return await driverConfig.requireAsync('fake');
}

describe('FakeDriver via HTTP', function () {
  let server: AppiumServer | void;
  let appiumHome: string;
  let FakeDriver: DriverClass;
  let testServerBaseSessionUrl: string;
  let sandbox: SinonSandbox;

  before(async function () {

    sandbox = createSandbox();
    appiumHome = await tempDir.openDir();
    wdOpts.port = port = await getTestPort();
    testServerBaseUrl = `http://${TEST_HOST}:${port}`;
    testServerBaseSessionUrl = `${testServerBaseUrl}/session`;
    FakeDriver = await initFakeDriver(appiumHome);
  });

  after(async function () {
    await fs.rimraf(appiumHome);
    sandbox.restore();
  });

  function withServer(args: Partial<ParsedArgs> = {}) {
    // eslint-disable-next-line mocha/no-sibling-hooks
    before(async function () {
      const merged = {...args, appiumHome, port, address: TEST_HOST};
      if (shouldStartServer) {
        server = await appiumServer(merged);
      }
    });
    // eslint-disable-next-line mocha/no-sibling-hooks
    after(async function () {
      if (server) {
        await server.close();
      }
    });
  }

  describe('server updating', function () {
    withServer();
    it('should allow drivers to update the server in arbitrary ways', async function () {
      const {data} = await axios.get(`${testServerBaseUrl}/fakedriver`);
      expect(data).to.eql({fakedriver: 'fakeResponse'});
    });
    it('should update the server with cliArgs', async function () {
      // we don't need to check the entire object, since it's large, but we can ensure an
      // arg got through.
      expect((await axios.post(`http://${TEST_HOST}:${port}/fakedriverCliArgs`)).data).to.have.property(
        'appiumHome',
        appiumHome,
      );
    });
  });

  describe('cli args handling for empty args', function () {
    withServer();
    it('should not receive user cli args if none passed in', async function () {
      const driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriverargs`);
        expect(data.value.sillyWebServerPort).to.not.exist;
        expect(data.value.sillyWebServerHost).to.not.exist;
      } finally {
        await driver.deleteSession();
      }
    });
  });

  describe('cli args handling for passed in args', function () {
    withServer(FAKE_DRIVER_ARGS);
    it('should receive user cli args from a driver if arguments were passed in', async function () {
      const driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriverargs`);
        expect(data.value.sillyWebServerPort).to.eql(sillyWebServerPort);
        expect(data.value.sillyWebServerHost).to.eql(sillyWebServerHost);
      } finally {
        await driver.deleteSession();
      }
    });
  });

  describe('default capabilities via cli', function () {
    withServer({
      defaultCapabilities: {
        'appium:options': {
          automationName: 'Fake',
          deviceName: 'Fake',
          app: TEST_FAKE_APP,
        },
        platformName: 'Fake',
      },
    });
    it('should allow appium-prefixed caps sent via appium:options through --default-capabilities', async function () {
      const appiumOptsCaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{}],
        },
      };

      // Create the session
      const {value} = (await axios.post(testServerBaseSessionUrl, appiumOptsCaps)).data;
      try {
        expect(value.sessionId).to.be.a.string;
        expect(value).to.exist;
        expect(value.capabilities).to.deep.equal({
          automationName: 'Fake',
          platformName: 'Fake',
          deviceName: 'Fake',
          app: TEST_FAKE_APP,
        });
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });
  });

  describe('inspector commands', function () {
    withServer();
    let driver;

    beforeEach(async function () {
      driver = await wdio({...wdOpts, capabilities: caps});
    });
    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
        driver = null;
      }
    });

    it('should list available driver commands', async function () {
      driver.addCommand(
        'listCommands',
        async () => (await axios.get(
          `${testServerBaseSessionUrl}/${driver.sessionId}/appium/commands`
        )).data.value
      );

      const commands = await driver.listCommands();

      expect(JSON.stringify(commands.rest.base['/session/:sessionId/frame'])).to.eql(
        JSON.stringify({POST: {command: 'setFrame', params: [
          {name: 'id', required: true}
        ]}}));
      expect(_.size(commands.rest.driver)).to.be.greaterThan(1);

      expect(JSON.stringify(commands.bidi.base.session.subscribe)).to.eql(
        JSON.stringify({
          command: 'bidiSubscribe',
          'params': [
            {
              name: 'events',
              required: true
            },
            {
              name: 'contexts',
              required: false
            }
          ]
        })
      );
      expect(_.size(commands.bidi.base)).to.be.greaterThan(1);
      expect(_.size(commands.bidi.driver)).to.be.greaterThan(0);
    });

    it('should list available driver extensions', async function () {
      driver.addCommand(
        'listExtensions',
        async () => (await axios.get(
          `${testServerBaseSessionUrl}/${driver.sessionId}/appium/extensions`
        )).data.value
      );

      const extensions = await driver.listExtensions();
      expect(JSON.stringify(extensions.rest.driver['fake: setThing'])).to.eql(
        JSON.stringify({
          command: 'setFakeThing',
          params: [{
            name: 'thing',
            required: true
          }]
        })
      );
      expect(_.size(extensions.rest.driver)).to.be.greaterThan(1);
    });
  });

  describe('session handling', function () {
    withServer();

    it('should start and stop a session and not allow commands after session stopped', async function () {
      const driver = await wdio({...wdOpts, capabilities: caps});
      expect(driver.sessionId).to.exist;
      expect(driver.sessionId).to.be.a('string');
      await driver.deleteSession();
      await expect(driver.getTitle()).to.eventually.be.rejected;
    });

    it('should be able to run two FakeDriver sessions simultaneously', async function () {
      const driver1 = await wdio({...wdOpts, capabilities: caps});
      expect(driver1.sessionId).to.exist;
      expect(driver1.sessionId).to.be.a('string');
      const driver2 = await wdio({...wdOpts, capabilities: caps});
      expect(driver2.sessionId).to.exist;
      expect(driver2.sessionId).to.be.a('string');
      expect(driver2.sessionId).to.not.equal(driver1.sessionId);
      await driver1.deleteSession();
      await driver2.deleteSession();
    });

    it('should not be able to run two FakeDriver sessions simultaneously when one is unique', async function () {
      const uniqueCaps = _.clone(caps);
      uniqueCaps['appium:uniqueApp'] = true;
      const driver1 = await wdio({...wdOpts, capabilities: uniqueCaps});
      expect(driver1.sessionId).to.exist;
      expect(driver1.sessionId).to.be.a('string');
      await expect(wdio({...wdOpts, capabilities: caps})).to.eventually.be.rejected;
      await driver1.deleteSession();
    });

    it('should use the newCommandTimeout of the inner Driver on session creation', async function () {
      const localCaps = {
        'appium:newCommandTimeout': 0.25,
        ...caps,
      };
      const driver = await wdio({...wdOpts, capabilities: localCaps});
      expect(driver.sessionId).to.exist;

      await B.delay(250);
      await expect(driver.getPageSource()).to.eventually.be.rejectedWith(/terminated/);
    });

    it('should not allow umbrella commands to prevent newCommandTimeout on inner driver', async function () {
      const localCaps = {
        'appium:newCommandTimeout': 0.25,
        ...caps,
      };
      const driver = await wdio({...wdOpts, capabilities: localCaps});
      expect(driver.sessionId).to.exist;
      driver.addCommand(
        'getStatus',
        async () => (await axios.get(`${testServerBaseUrl}/status`)).data.value
      );

      // get the session list 6 times over 300ms. each request will be below the new command
      // timeout but since they are not received by the driver the session should still time out
      for (let i = 0; i < 6; i++) {
        await (driver as any).getStatus();
        await B.delay(50);
      }
      await expect(driver.getPageSource()).to.eventually.be.rejectedWith(/terminated/);
    });

    it('should accept valid W3C capabilities and start a W3C session', async function () {
      // Try with valid capabilities and check that it returns a session ID
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {'appium:automationName': 'Fake', platformName: 'Fake'},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        },
      };

      // Create the session
      const {status, value, sessionId} = (await axios.post(testServerBaseSessionUrl, w3cCaps)).data;
      try {
        expect(status).to.not.exist; // Test that it's a W3C session
        expect(sessionId).to.not.exist;
        expect(value.sessionId).to.be.a('string');
        expect(value).to.exist;
        expect(value.capabilities).to.deep.equal({
          automationName: 'Fake',
          platformName: 'Fake',
          deviceName: 'Fake',
          app: TEST_FAKE_APP,
        });

        // Now use that sessionId to call /screenshot
        const {status: screenshotStatus, value: screenshotValue} = (
          await axios({
            url: `${testServerBaseSessionUrl}/${value.sessionId}/screenshot`,
          })
        ).data;
        expect(screenshotStatus).to.not.exist;
        expect(screenshotValue).to.match(/^iVBOR/); // should be a png

        // Now use that sessionID to call an arbitrary W3C-only endpoint that isn't implemented to see if it responds with correct error
        await expect(
          axios.post(`${testServerBaseSessionUrl}/${value.sessionId}/execute/async`, {
            script: '',
            args: ['a'],
          })
        ).to.eventually.be.rejectedWith(/405/);
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should allow appium-prefixed caps sent via appium:options', async function () {
      // Try with valid capabilities and check that it returns a session ID
      const appiumOptsCaps = {
        capabilities: {
          alwaysMatch: {
            'appium:options': {
              automationName: 'Fake',
              deviceName: 'Fake',
              app: TEST_FAKE_APP,
            },
            platformName: 'Fake',
          },
          firstMatch: [{}],
        },
      };

      // Create the session
      const {status, value, sessionId} = (
        await axios.post(testServerBaseSessionUrl, appiumOptsCaps)
      ).data;
      try {
        expect(status).to.not.exist; // Test that it's a W3C session
        expect(sessionId).to.not.exist;
        expect(value.sessionId).to.be.a('string');
        expect(value).to.exist;
        expect(value.capabilities).to.deep.equal({
          automationName: 'Fake',
          platformName: 'Fake',
          deviceName: 'Fake',
          app: TEST_FAKE_APP,
        });
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should reject invalid W3C capabilities and respond with a 400 Bad Parameters error', async function () {
      const badW3Ccaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [{'appium:deviceName': 'Fake', 'appium:app': TEST_FAKE_APP}],
        },
      };

      await expect(
        axios.post(testServerBaseSessionUrl, badW3Ccaps)
      ).to.eventually.be.rejectedWith(/400/);
    });

    it('should accept a combo of W3C and JSONWP capabilities but completely ignore JSONWP', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
          jsonwpParam: 'jsonwpParam',
        },
        capabilities: {
          alwaysMatch: {...caps},
          firstMatch: [
            {
              'appium:w3cParam': 'w3cParam',
            },
          ],
        },
      };

      const {status, value, sessionId} = (await axios.post(testServerBaseSessionUrl, combinedCaps))
        .data;
      try {
        expect(status).to.not.exist;
        expect(sessionId).to.not.exist;
        expect(value.sessionId).to.exist;
        expect(value.capabilities).to.deep.equal({
          ...removeAppiumPrefixes(caps),
          w3cParam: 'w3cParam',
        });
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should reject bad automation name with an appropriate error', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {
            ...caps,
            'appium:automationName': 'BadAutomationName',
          },
        },
      };
      await expect(axios.post(testServerBaseSessionUrl, w3cCaps)).to.eventually.be.rejectedWith(/500/);
    });

    it('should accept capabilities that are provided in the firstMatch array', async function () {
      const w3cCaps = {
        capabilities: {
          alwaysMatch: {},
          firstMatch: [
            {},
            {
              ...caps,
            },
          ],
        },
      };
      const {value, sessionId, status} = (await axios.post(testServerBaseSessionUrl, w3cCaps)).data;
      try {
        expect(status);
        expect(sessionId);
        expect(value.capabilities).to.deep.equal(removeAppiumPrefixes(caps));
      } finally {
        // End session
        await axios.delete(`${testServerBaseSessionUrl}/${value.sessionId}`);
      }
    });

    it('should not fall back to MJSONWP if w3c caps are invalid', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {},
          firstMatch: [
            {},
            {
              ...caps,
              platformName: null,
              'appium:automationName': null,
              'appium:deviceName': null,
            },
          ],
        },
      };
      const res = await axios.post(testServerBaseSessionUrl, combinedCaps, {
        validateStatus: null,
      });
      expect(res.status).to.eql(400);
      expect(res.data.value.error).to.match(/invalid argument/);
    });

    it('should not fall back to MJSONWP even if Inner Driver is not ready for W3C', async function () {
      const combinedCaps = {
        desiredCapabilities: {
          ...caps,
        },
        capabilities: {
          alwaysMatch: {
            ...caps,
            'appium:deviceName': 'Fake',
          },
        },
      };
      const createSessionStub = sandbox
        .stub(FakeDriver.prototype, 'createSession')
        .callsFake(async function (caps) {
          const res = await BaseDriver.prototype.createSession.call(this, caps);
          expect(this.protocol).to.equal('W3C');
          return res;
        });
      try {
        const res = await axios.post(testServerBaseSessionUrl, combinedCaps, {
          validateStatus: null,
        });
        const {status} = res;
        expect(status).to.eql(200);
      } finally {
        createSessionStub.restore();
      }
    });

    it('should allow drivers to update the method map with new routes and commands', async function () {
      const driver = await wdio({...wdOpts, capabilities: caps});
      const {sessionId} = driver;
      try {
        await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fakedriver`, {
          thing: {yes: 'lolno'},
        });
        expect(
          (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakedriver`)).data.value
        ).to.eql({yes: 'lolno'});
      } finally {
        await driver.deleteSession();
      }
    });
  });

  describe('Bidi protocol', function () {
    withServer();
    const capabilities = {...caps, webSocketUrl: true, 'appium:runClock': true};
    let driver;

    beforeEach(async function () {
      driver = await wdio({...wdOpts, capabilities});
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should respond with bidi specific capability when a driver supports it', async function () {
      expect(driver.capabilities.webSocketUrl);
    });

    it('should interpret the bidi protocol and let the driver handle it by command', async function () {
      expect(await driver.getUrl()).to.not.exist;

      await driver.browsingContextNavigate({
        context: 'foo',
        url: 'https://appium.io',
        wait: 'complete',
      });
      await expect(driver.getUrl()).to.eventually.eql('https://appium.io');
    });

    it('should be able to subscribe and unsubscribe to bidi events', async function () {
      const collectedEvents: number[] = [];
      (driver as any).on('appium:clock.currentTime', (ev: {time: number}) => {
        collectedEvents.push(ev.time);
      });

      // wait for some time to be sure clock events have happened, and assert we don't receive
      // any yet
      await B.delay(750);
      expect(collectedEvents).to.be.empty;

      // now subscribe and wait and assert that some events have been collected
      await driver.sessionSubscribe({events: ['appium:clock.currentTime']});
      await B.delay(750);
      expect(collectedEvents).to.not.be.empty;

      // finally  unsubscribe and wait and assert that some events have been collected
      await driver.sessionUnsubscribe({events: ['appium:clock.currentTime']});
      collectedEvents.length = 0;
      await B.delay(750);
      expect(collectedEvents).to.be.empty;
    });

    it('should allow custom bidi commands', async function () {
      let {result} = await driver.send({method: 'appium:fake.getFakeThing', params: {}});
      expect(result);
      await driver.send({method: 'appium:fake.setFakeThing', params: {thing: 'this is from bidi'}});
      ({result} = await driver.send({method: 'appium:fake.getFakeThing', params: {}}));
      expect(result).to.eql('this is from bidi');
    });
  });

  describe('Bidi protocol with base path', function () {
    const basePath = '/wd/hub';
    withServer({basePath});
    const capabilities = {...caps, webSocketUrl: true, 'appium:runClock': true};
    let driver;

    beforeEach(async function () {
      driver = await wdio({...wdOpts, path: basePath, capabilities});
    });

    afterEach(async function () {
      if (driver) {
        await driver.deleteSession();
      }
    });

    it('should respond with bidi specific capability when a driver supports it', async function () {
      expect(driver.capabilities.webSocketUrl);
    });

    it('should interpret the bidi protocol and let the driver handle it by command', async function () {
      expect(await driver.getUrl()).to.not.exist;

      await driver.browsingContextNavigate({
        context: 'foo',
        url: 'https://appium.io',
        wait: 'complete',
      });
      await expect(driver.getUrl()).to.eventually.eql('https://appium.io');
    });
  });
});

describe('Bidi over SSL', function () {
  async function generateCertificate(certPath: string, keyPath: string) {
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

  let server: AppiumServer;
  let appiumHome: string;
  let driver: Browser;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let FakeDriver: DriverClass;
  const certPath = 'certificate.cert';
  const keyPath = 'certificate.key';
  const capabilities = {...caps, webSocketUrl: true};
  let previousEnvValue: string | undefined;

  before(async function () {
    // Skip on Node.js 24+ due to spdy package incompatibility (http_parser removed)
    const nodeMajorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
    if (nodeMajorVersion >= 24) {
      return this.skip();
    }

    try {
      await generateCertificate(certPath, keyPath);
    } catch (e) {
      if (process.env.CI) {
        throw e;
      }
      return this.skip();
    }
    appiumHome = await tempDir.openDir();
    wdOpts.port = port = await getTestPort();
    testServerBaseUrl = `https://${TEST_HOST}:${port}`;
    FakeDriver = await initFakeDriver(appiumHome);
    server = await appiumServer({
      address: TEST_HOST,
      port,
      appiumHome,
      sslCertificatePath: certPath,
      sslKeyPath: keyPath,
    });
  });

  after(async function () {
    if (server) {
      await fs.rimraf(appiumHome);
      await server.close();
    }
  });

  beforeEach(async function () {
    previousEnvValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    driver = await wdio({...wdOpts, protocol: 'https', strictSSL: false, capabilities});
  });

  afterEach(async function () {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousEnvValue;
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should still run bidi over ssl', async function () {
    expect(await driver.getUrl()).to.not.exist;

    await driver.browsingContextNavigate({
      context: 'foo',
      url: 'https://appium.io',
      wait: 'complete',
    });
    await expect(driver.getUrl()).to.eventually.eql('https://appium.io');
  });
});

// TODO this test only works if the log has not previously been initialized in the same process.
describe.skip('Logsink', function () {
  let server: Awaited<ReturnType<typeof appiumServer>> | null = null;
  const logs: [string, string][] = [];
  const logHandler = function (level: string, message: string) {
    logs.push([level, message]);
  };
  const args = {
    port,
    address: TEST_HOST,
    logHandler,
  };

  before(async function () {
    server = await appiumServer(args);
  });

  after(async function () {
    if (server) {
      await server.close();
    }
  });

  it('should send logs to a logHandler passed in by a parent package', function () {
    expect(logs.length).to.be.above(1);
    const welcomeIndex = logs[0][1].includes('versions of node') ? 1 : 0;
    expect(logs[welcomeIndex].length).to.equal(2);
    expect(logs[welcomeIndex][1]).to.include('Welcome to Appium');
  });
});
