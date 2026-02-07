import type {AppiumServer} from '@appium/types';
import type {ParsedArgs} from 'appium/types';
import type {Browser} from 'webdriverio';
import {fs, tempDir} from '@appium/support';
import axios from 'axios';
import B from 'bluebird';
import {remote as wdio} from 'webdriverio';
import {runExtensionCommand} from '../../lib/cli/extension';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../../lib/constants';
import {loadExtensions} from '../../lib/extension';
import {INSTALL_TYPE_LOCAL} from '../../lib/extension/extension-config';
import {main as appiumServer} from '../../lib/main';
import {resetSchema} from '../../lib/schema';
import {
  FAKE_DRIVER_DIR,
  FAKE_PLUGIN_DIR,
  getTestPort,
  TEST_HOST,
  W3C_PREFIXED_CAPS,
} from '../helpers';
import {expect} from 'chai';

const FAKE_ARGS = {sillyWebServerPort: 1234, host: 'hey'};
const FAKE_PLUGIN_ARGS = {fake: FAKE_ARGS};

const wdOpts: {
  hostname: string;
  port?: number;
  connectionRetryCount: number;
  capabilities: object;
} = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  capabilities: W3C_PREFIXED_CAPS,
};

let baseServerArgs: Partial<ParsedArgs>;

function serverSetup(args: Record<string, unknown>) {
  let server: Awaited<ReturnType<typeof appiumServer>> | null = null;

  /* eslint-disable mocha/no-top-level-hooks -- hooks are intentionally in a helper */
  before(async function () {
    server = await appiumServer({...baseServerArgs, ...args});
  });
  after(async function () {
    if (server) {
      await server.close();
    }
  });
  /* eslint-enable mocha/no-top-level-hooks */
}

describe('FakePlugin w/ FakeDriver via HTTP', function () {
  let appiumHome: string;
  let testServerBaseUrl: string;
  let port: number;
  let testServerBaseSessionUrl: string;
  before(async function () {

    resetSchema();
    appiumHome = await tempDir.openDir();
    wdOpts.port = port = await getTestPort();
    testServerBaseUrl = `http://${TEST_HOST}:${port}`;
    testServerBaseSessionUrl = `${testServerBaseUrl}/session`;
    const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);
    // first ensure we have fakedriver installed
    const driverList = await runExtensionCommand(
      {
        driverCommand: 'list',
        showInstalled: true,
        subcommand: DRIVER_TYPE,
        suppressOutput: true,
      },
      driverConfig,
    );
    if (!('fake' in driverList)) {
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

    const pluginList = await runExtensionCommand(
      {
        pluginCommand: 'list',
        showInstalled: true,
        subcommand: PLUGIN_TYPE,
        json: true,
        suppressOutput: true,
      },
      pluginConfig,
    );
    if (!('fake' in pluginList)) {
      await runExtensionCommand(
        {
          pluginCommand: 'install',
          subcommand: PLUGIN_TYPE,
          plugin: FAKE_PLUGIN_DIR,
          installType: INSTALL_TYPE_LOCAL,
        },
        pluginConfig,
      );
    }

    baseServerArgs = {
      appiumHome,
      port,
      address: TEST_HOST,
      usePlugins: ['fake'],
      useDrivers: ['fake'],
    };
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('without plugin registered', function () {
    it('should reject server creation if plugin is not activated', async function () {
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['other1', 'other2'],
      };
      await expect(appiumServer(args)).to.eventually.be.rejected;
    });
    it('should reject server creation if reserved plugin name is provided with other names', async function () {
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['fake', 'all'],
      };
      await expect(appiumServer(args)).to.eventually.be.rejected;
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      const usePlugins = registrationType === 'explicit' ? ['fake'] : ['all'];
      serverSetup({usePlugins});
      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        expect((await axios.post(`http://${TEST_HOST}:${port}/fake`)).data).to.eql(res);
      });
      it('should update the server with cliArgs', async function () {
        const res = usePlugins;
        // we don't need to check the entire object, since it's large, but we can ensure an
        // arg got through.
        expect((await axios.post(`http://${TEST_HOST}:${port}/cliArgs`)).data.usePlugins).to.eql(res);
      });
      it('should modify the method map with new commands', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fake_data`, {
            data: {fake: 'data'},
          });
          expect(
            (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fake_data`)).data.value
          ).to.eql({fake: 'data'});
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and not call the original', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          await expect(driver.getPageSource()).to.eventually.eql(
            `<Fake>${JSON.stringify([sessionId])}</Fake>`
          );
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and call the original if designed', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          const el = (
            await axios.post(`${testServerBaseSessionUrl}/${sessionId}/element`, {
              using: 'xpath',
              value: '//MockWebView',
            })
          ).data.value;
          expect(el).to.have.property('fake');
        } finally {
          await driver.deleteSession();
        }
      });

      it('should allow original command to be proxied if supported', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {
            name: 'PROXY',
          });
          const handle = (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/window`))
            .data.value;
          expect(handle).to.eql('<<proxied via proxyCommand>>');
        } finally {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {
            name: 'NATIVE_APP',
          });
          await driver.deleteSession();
        }
      });

      it('should handle unexpected driver shutdown', async function () {
        const newOpts = {...wdOpts};
        newOpts.capabilities = {
          ...(newOpts.capabilities ?? {}),
          'appium:newCommandTimeout': 1,
        };
        const driver = await wdio(newOpts as any);
        let shutdownErr;
        try {
          let res = await axios.get(`http://${TEST_HOST}:${port}/unexpected`);
          expect(res.data).to.not.exist;
          await B.delay(1500);
          res = await axios.get(`http://${TEST_HOST}:${port}/unexpected`);
          expect(res.data).to.match(/Session ended/);
          expect(res.data).to.match(/timeout/);
          await driver.deleteSession();
        } catch (e) {
          shutdownErr = e;
        }
        expect(shutdownErr).to.exist;
        expect(shutdownErr!.message).to.match(/either terminated or not started/);
      });

      it('should allow plugin handled commands to reset newCommandTimeout', async function () {
        const newOpts = {...wdOpts};
        newOpts.capabilities = {
          ...(newOpts.capabilities ?? {}),
          'appium:newCommandTimeout': 2,
        };
        const driver = await wdio(newOpts as any);
        const {sessionId} = driver;
        try {
          const start = Date.now();
          for (let i = 0; i < 5; i++) {
            await B.delay(500);
            await driver.getPageSource();
          }
          // prove that we went beyond the new command timeout as a result of sending commands
          expect(Date.now() - start).to.be.above(2500);
          await expect(driver.getPageSource()).to.eventually.eql(
            `<Fake>${JSON.stringify([sessionId])}</Fake>`
          );
        } finally {
          await driver.deleteSession();
        }
      });
    });
  }
  describe('cli args handling for plugin args', function () {
    let server: AppiumServer | void;
    before(async function () {
      // then start server if we need to
      const args = {...baseServerArgs, plugin: FAKE_PLUGIN_ARGS};
      server = await appiumServer(args);
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });

    it('should receive user cli args for plugin if passed in', async function () {
      const driver = await wdio(wdOpts as any);
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
        expect(data.value).to.eql(FAKE_ARGS);
      } finally {
        await driver.deleteSession();
      }
    });
  });
  describe('cli args handling for empty plugin args', function () {
    let server: AppiumServer | void;
    before(async function () {
      // then start server if we need to
      server = await appiumServer(baseServerArgs);
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });

    describe('when no cli args provided by user', function () {
      it('should receive an empty `cliArgs` object', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
          expect(data.value).to.eql({});
        } finally {
          await driver.deleteSession();
        }
      });
    });
  });

  describe('Execute Methods', function () {
    let server: AppiumServer;

    let driver: Browser;

    before(async function () {
      // then start server if we need to
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['fake'],
        useDrivers: ['fake'],
      };
      server = await appiumServer(args);
      driver = await wdio(wdOpts as any);
    });
    after(async function () {
      if (driver) {
        await driver.deleteSession();
      }
      if (server) {
        await server.close();
      }
    });

    it('should handle execute methods using executeMethodMap', async function () {
      const res = await driver.executeScript('fake: plugMeIn', [{socket: 'electrical'}]);
      expect(res).to.eql('Plugged in to electrical');
    });

    it('should handle execute methods overridden on the driver', async function () {
      const res = await driver.executeScript('fake: getThing', []);
      expect(res).to.eql('PLUGIN_FAKE_THING');
    });

    it('should let driver handle unknown execute methods', async function () {
      const sum = await driver.executeScript('fake: addition', [{num1: 2, num2: 3}]);
      expect(sum).to.eql(5);
    });
  });

  describe('BiDi support', function () {
    describe('with a single plugin', function() {
      let driver: Browser;

      // this 'after' block needs to come before 'serverSetup' so that the delete session happens
      // before the server shutdown
      after(async function () {
        if (driver) {
          await driver.deleteSession();
        }
      });

      serverSetup({});

      before(async function () {
        const caps = {...wdOpts.capabilities, webSocketUrl: true, 'appium:runClock': true};
        driver = await wdio({...wdOpts, capabilities: caps} as any);
      });

      it('should handle custom bidi commands if registered', async function () {
        let {result} = await (driver as any).send({
          method: 'appium:fake.getPluginThing',
          params: {},
        });
        expect(result).to.not.exist;
        await (driver as any).send({method: 'appium:fake.setPluginThing', params: {thing: 'plugin bidi'}});
        ({result} = await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}}));
        expect(result).to.eql('plugin bidi');
      });

      it('should subscribe and unsubscribe to/from custom bidi events', async function () {
        let retrievals = 0;
        (driver as any).on('appium:fake.pluginThingRetrieved', () => {
          retrievals++;
        });

        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        expect(retrievals).to.eql(0);

        await (driver as any).sessionSubscribe({events: ['appium:fake.pluginThingRetrieved']});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        expect(retrievals).to.eql(2);

        await (driver as any).sessionUnsubscribe({events: ['appium:fake.pluginThingRetrieved']});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        expect(retrievals).to.eql(2);
      });

      it('should subscribe and unsubscribe to/from custom bidi events and merge with driver', async function () {
        const collectedEvents: number[] = [];
        (driver as any).on('appium:clock.currentTime', (ev: {time: number}) => {
          collectedEvents.push(ev.time);
        });

        await B.delay(750);
        expect(collectedEvents).to.be.empty;

        await (driver as any).sessionSubscribe({events: ['appium:clock.currentTime']});
        await B.delay(800);
        expect(collectedEvents.length).to.eql(5);

        await (driver as any).sessionUnsubscribe({events: ['appium:clock.currentTime']});
        collectedEvents.length = 0;
        await B.delay(800);
        expect(collectedEvents).to.be.empty;
      });

      it('should call underlying driver bidi method if next is called', async function () {
        const {result} = await (driver as any).send({
          method: 'appium:fake.doSomeMath',
          params: {num1: 2, num2: 3},
        });
        expect(result).to.eql(11);
      });

      it('should override and not call underlying driver bidi method if next is not called', async function () {
        const {result} = await (driver as any).send({
          method: 'appium:fake.doSomeMath2',
          params: {num1: 2, num2: 3},
        });
        expect(result).to.eql(6);
      });
    });
  });
});
