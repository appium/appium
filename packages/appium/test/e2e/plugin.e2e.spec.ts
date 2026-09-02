import assert from 'node:assert/strict';
import {describe, it, before, after} from 'node:test';

import {httpGet, httpPost} from '@appium/driver-test-support';
import {fs, tempDir} from '@appium/support';
import type {AppiumServer} from '@appium/types';
import type {ParsedArgs} from 'appium/types/index.js';
import {sleep} from 'asyncbox';
import type {Browser} from 'webdriverio';
import {remote as wdio} from 'webdriverio';

import {runExtensionCommand} from '../../lib/cli/extension.js';
import {DRIVER_TYPE, PLUGIN_TYPE} from '../../lib/constants.js';
import {INSTALL_TYPE_LOCAL} from '../../lib/extension/extension-config.js';
import {loadExtensions} from '../../lib/extension/index.js';
import {main as appiumServer} from '../../lib/main.js';
import {resetSchema} from '../../lib/schema/index.js';
import {FAKE_DRIVER_DIR, FAKE_PLUGIN_DIR, getTestPort, TEST_HOST, W3C_PREFIXED_CAPS} from '../helpers.js';

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

function createServer(): {
  setup: (args?: Partial<ParsedArgs>) => Promise<void>;
  teardown: () => Promise<void>;
} {
  let server: Awaited<ReturnType<typeof appiumServer>> | null = null;
  return {
    setup: async (args?: Partial<ParsedArgs>) => {
      server = await appiumServer({...baseServerArgs, ...(args ?? {})});
    },
    teardown: async () => {
      await server?.close();
    },
  };
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
      await assert.rejects(appiumServer(args));
    });
    it('should reject server creation if reserved plugin name is provided with other names', async function () {
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['fake', 'all'],
      };
      await assert.rejects(appiumServer(args));
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      const usePlugins = registrationType === 'explicit' ? ['fake'] : ['all'];
      const {setup, teardown} = createServer();
      before(async function () {
        await setup({usePlugins});
      });
      after(async function () {
        await teardown();
      });

      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        assert.deepStrictEqual((await httpPost(`http://${TEST_HOST}:${port}/fake`)).data, res);
      });
      it('should update the server with cliArgs', async function () {
        const res = usePlugins;
        // we don't need to check the entire object, since it's large, but we can ensure an
        // arg got through.
        assert.deepStrictEqual((await httpPost(`http://${TEST_HOST}:${port}/cliArgs`)).data.usePlugins, res);
      });
      it('should let updateServer intercept requests to routes Appium itself owns via httpServer.frontRouter', async function () {
        // /status is a built-in route, registered before updateServer runs
        const res = await httpGet(`http://${TEST_HOST}:${port}/status`);
        assert.strictEqual(res.headers['x-fake-plugin-pre-server'], 'true');
      });
      it('should modify the method map with new commands', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          await httpPost(`${testServerBaseSessionUrl}/${sessionId}/fake_data`, {
            data: {fake: 'data'},
          });
          assert.deepStrictEqual((await httpGet(`${testServerBaseSessionUrl}/${sessionId}/fake_data`)).data.value, {
            fake: 'data',
          });
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and not call the original', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          assert.strictEqual(await driver.getPageSource(), `<Fake>${JSON.stringify([sessionId])}</Fake>`);
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and call the original if designed', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          const el = (
            await httpPost(`${testServerBaseSessionUrl}/${sessionId}/element`, {
              using: 'xpath',
              value: '//MockWebView',
            })
          ).data.value;
          assert.ok(Object.hasOwn(el, 'fake'));
        } finally {
          await driver.deleteSession();
        }
      });

      it('should allow original command to be proxied if supported', async function () {
        const driver = await wdio(wdOpts as any);
        const {sessionId} = driver;
        try {
          await httpPost(`${testServerBaseSessionUrl}/${sessionId}/context`, {
            name: 'PROXY',
          });
          const handle = (await httpGet(`${testServerBaseSessionUrl}/${sessionId}/window`)).data.value;
          assert.strictEqual(handle, '<<proxied via proxyCommand>>');
        } finally {
          await httpPost(`${testServerBaseSessionUrl}/${sessionId}/context`, {
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
        let shutdownErr: Error | undefined;
        try {
          let res = await httpGet(`http://${TEST_HOST}:${port}/unexpected`);
          assert.ok(!res.data);
          await sleep(1500);
          res = await httpGet(`http://${TEST_HOST}:${port}/unexpected`);
          assert.match(res.data, /Session ended/);
          assert.match(res.data, /timeout/);
          await driver.deleteSession();
        } catch (e) {
          shutdownErr = e instanceof Error ? e : new Error(String(e));
        }
        assert.ok(shutdownErr);
        assert.match(shutdownErr!.message, /either terminated or not started/);
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
            await sleep(500);
            await driver.getPageSource();
          }
          // prove that we went beyond the new command timeout as a result of sending commands
          assert.ok(Date.now() - start > 2500);
          assert.strictEqual(await driver.getPageSource(), `<Fake>${JSON.stringify([sessionId])}</Fake>`);
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
        const {data} = await httpGet(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
        assert.deepStrictEqual(data.value, FAKE_ARGS);
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
          const {data} = await httpGet(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
          assert.deepStrictEqual(data.value, {});
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
      assert.strictEqual(res, 'Plugged in to electrical');
    });

    it('should handle execute methods overridden on the driver', async function () {
      const res = await driver.executeScript('fake: getThing', []);
      assert.strictEqual(res, 'PLUGIN_FAKE_THING');
    });

    it('should let driver handle unknown execute methods', async function () {
      const sum = await driver.executeScript('fake: addition', [{num1: 2, num2: 3}]);
      assert.strictEqual(sum, 5);
    });
  });

  describe('BiDi support', function () {
    describe('with a single plugin', function () {
      let driver: Browser;
      const {setup, teardown} = createServer();

      before(async function () {
        await setup();
      });
      // this 'after' block needs to come before 'serverSetup' so that the delete session happens
      // before the server shutdown
      after(async function () {
        try {
          await driver?.deleteSession();
        } finally {
          await teardown();
        }
      });

      before(async function () {
        const caps = {...wdOpts.capabilities, webSocketUrl: true, 'appium:runClock': true};
        driver = await wdio({...wdOpts, capabilities: caps} as any);
      });

      it('should handle custom bidi commands if registered', async function () {
        let {result} = await (driver as any).send({
          method: 'appium:fake.getPluginThing',
          params: {},
        });
        assert.ok(!result);
        await (driver as any).send({
          method: 'appium:fake.setPluginThing',
          params: {thing: 'plugin bidi'},
        });
        ({result} = await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}}));
        assert.strictEqual(result, 'plugin bidi');
      });

      it('should subscribe and unsubscribe to/from custom bidi events', async function () {
        let retrievals = 0;
        (driver as any).on('appium:fake.pluginThingRetrieved', () => {
          retrievals++;
        });

        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        assert.strictEqual(retrievals, 0);

        await (driver as any).sessionSubscribe({events: ['appium:fake.pluginThingRetrieved']});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        assert.strictEqual(retrievals, 2);

        await (driver as any).sessionUnsubscribe({events: ['appium:fake.pluginThingRetrieved']});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        await (driver as any).send({method: 'appium:fake.getPluginThing', params: {}});
        assert.strictEqual(retrievals, 2);
      });

      it('should subscribe and unsubscribe to/from custom bidi events and merge with driver', async function () {
        const collectedEvents: number[] = [];
        (driver as any).on('appium:clock.currentTime', (ev: {time: number}) => {
          collectedEvents.push(ev.time);
        });

        await sleep(750);
        assert.strictEqual(collectedEvents.length, 0);

        await (driver as any).sessionSubscribe({events: ['appium:clock.currentTime']});
        await sleep(800);
        assert.strictEqual(collectedEvents.length, 5);

        await (driver as any).sessionUnsubscribe({events: ['appium:clock.currentTime']});
        collectedEvents.length = 0;
        await sleep(800);
        assert.strictEqual(collectedEvents.length, 0);
      });

      it('should call underlying driver bidi method if next is called', async function () {
        const {result} = await (driver as any).send({
          method: 'appium:fake.doSomeMath',
          params: {num1: 2, num2: 3},
        });
        assert.strictEqual(result, 11);
      });

      it('should override and not call underlying driver bidi method if next is not called', async function () {
        const {result} = await (driver as any).send({
          method: 'appium:fake.doSomeMath2',
          params: {num1: 2, num2: 3},
        });
        assert.strictEqual(result, 6);
      });
    });
  });

  describe('IPC Support', function () {
    let driver: Browser;
    const {setup, teardown} = createServer();
    before(async function () {
      await setup();
      const caps = {...wdOpts.capabilities, webSocketUrl: true, 'appium:runClock': true};
      driver = await wdio({...wdOpts, capabilities: caps} as any);
    });

    // this 'after' block needs to come before 'serverSetup' so that the delete session happens
    // before the server shutdown
    after(async function () {
      try {
        await driver?.deleteSession();
      } finally {
        await teardown();
      }
    });

    it('should allow driver to publish to plugin', async function () {
      let running = await driver.executeScript('fake: getFakeDriverClockStatus', []);
      assert.strictEqual(running, true);
      await driver.executeScript('fake: stopClock', []);
      running = await driver.executeScript('fake: getFakeDriverClockStatus', []);
      assert.strictEqual(running, false);
    });

    it('should allow plugin to publish to driver', async function () {
      let lastMath = await driver.executeScript('fake: getLastPluginMath', []);
      assert.strictEqual(lastMath, null);
      const {result} = await (driver as any).send({
        method: 'appium:fake.doSomeMath2',
        params: {num1: 2, num2: 3},
      });
      assert.strictEqual(result, 6);
      lastMath = await driver.executeScript('fake: getLastPluginMath', []);
      assert.strictEqual(lastMath.result, 6);
      assert.ok(lastMath.pluginName.includes('FakePlugin'));
    });
  });
});
