// @ts-check

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

const FAKE_ARGS = {sillyWebServerPort: 1234, host: 'hey'};
const FAKE_PLUGIN_ARGS = {fake: FAKE_ARGS};

/** @type {import('webdriverio').RemoteOptions} */
const wdOpts = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  capabilities: W3C_PREFIXED_CAPS,
};

/** @type {Partial<import('appium/types').ParsedArgs>} */
let baseServerArgs;

function serverSetup(args) {
  /** @type {AppiumServer|null} */
  let server = null;

  before(async function () { // eslint-disable-line mocha/no-top-level-hooks
    // then start server if we need to
    server = /** @type {AppiumServer} */ (
      await appiumServer({...baseServerArgs, ...args})
    );
  });
  after(async function () { // eslint-disable-line mocha/no-top-level-hooks
    if (server) {
      await server.close();
    }
  });
}

describe('FakePlugin w/ FakeDriver via HTTP', function () {
  /** @type {string} */
  let appiumHome;
  /** @type {string} */
  let testServerBaseUrl;
  /** @type {number} */
  let port;
  /** @type {string} */
  let testServerBaseSessionUrl;
  let should;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    should = chai.should();

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
      driverConfig
    );
    if (!('fake' in driverList)) {
      await runExtensionCommand(
        {
          driverCommand: 'install',
          driver: FAKE_DRIVER_DIR,
          installType: INSTALL_TYPE_LOCAL,
          subcommand: DRIVER_TYPE,
        },
        driverConfig
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
      pluginConfig
    );
    if (!('fake' in pluginList)) {
      await runExtensionCommand(
        {
          pluginCommand: 'install',
          subcommand: PLUGIN_TYPE,
          plugin: FAKE_PLUGIN_DIR,
          installType: INSTALL_TYPE_LOCAL,
        },
        pluginConfig
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
      await appiumServer(args).should.eventually.be.rejected;
    });
    it('should reject server creation if reserved plugin name is provided with other names', async function () {
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['fake', 'all'],
      };
      await appiumServer(args).should.eventually.be.rejected;
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      /** @type {import('type-fest').LiteralUnion<'all', string>[]} */
      const usePlugins = registrationType === 'explicit' ? ['fake'] : ['all'];
      serverSetup({usePlugins});
      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        (await axios.post(`http://${TEST_HOST}:${port}/fake`)).data.should.eql(res);
      });
      it('should update the server with cliArgs', async function () {
        const res = usePlugins;
        // we don't need to check the entire object, since it's large, but we can ensure an
        // arg got through.
        (await axios.post(`http://${TEST_HOST}:${port}/cliArgs`)).data.usePlugins.should.eql(res);
      });
      it('should modify the method map with new commands', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fake_data`, {
            data: {fake: 'data'},
          });
          (
            await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fake_data`)
          ).data.value.should.eql({fake: 'data'});
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and not call the original', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await driver
            .getPageSource()
            .should.eventually.eql(`<Fake>${JSON.stringify([sessionId])}</Fake>`);
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and call the original if designed', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          const el = (
            await axios.post(`${testServerBaseSessionUrl}/${sessionId}/element`, {
              using: 'xpath',
              value: '//MockWebView',
            })
          ).data.value;
          el.should.have.property('fake');
        } finally {
          await driver.deleteSession();
        }
      });

      it('should allow original command to be proxied if supported', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {
            name: 'PROXY',
          });
          const handle = (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/window/handle`))
            .data.value;
          handle.should.eql('<<proxied via proxyCommand>>');
        } finally {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {
            name: 'NATIVE_APP',
          });
          await driver.deleteSession();
        }
      });

      it('should handle unexpected driver shutdown', async function () {
        /** @type {import('webdriverio').RemoteOptions} */
        const newOpts = {...wdOpts};
        newOpts.capabilities = {
          ...(newOpts.capabilities ?? {}),
          'appium:newCommandTimeout': 1,
        };
        const driver = await wdio(newOpts);
        let shutdownErr;
        try {
          let res = await axios.get(`http://${TEST_HOST}:${port}/unexpected`);
          should.not.exist(res.data);
          await B.delay(1500);
          res = await axios.get(`http://${TEST_HOST}:${port}/unexpected`);
          res.data.should.match(/Session ended/);
          res.data.should.match(/timeout/);
          await driver.deleteSession();
        } catch (e) {
          shutdownErr = e;
        }
        shutdownErr.message.should.match(/either terminated or not started/);
      });

      it('should allow plugin handled commands to reset newCommandTimeout', async function () {
        /** @type {import('webdriverio').RemoteOptions} */
        const newOpts = {...wdOpts};
        newOpts.capabilities = {
          ...(newOpts.capabilities ?? {}),
          'appium:newCommandTimeout': 2,
        };
        const driver = await wdio(newOpts);
        const {sessionId} = driver;
        try {
          const start = Date.now();
          for (let i = 0; i < 5; i++) {
            await B.delay(500);
            await driver.getPageSource();
          }
          // prove that we went beyond the new command timeout as a result of sending commands
          (Date.now() - start).should.be.above(2500);
          await driver
            .getPageSource()
            .should.eventually.eql(`<Fake>${JSON.stringify([sessionId])}</Fake>`);
        } finally {
          await driver.deleteSession();
        }
      });
    });
  }
  describe('cli args handling for plugin args', function () {
    /** @type {AppiumServer} */
    let server;
    before(async function () {
      // then start server if we need to
      const args = {...baseServerArgs, plugin: FAKE_PLUGIN_ARGS};
      server = /** @type {AppiumServer} */ (await appiumServer(args));
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });

    it('should receive user cli args for plugin if passed in', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
        data.value.should.eql(FAKE_ARGS);
      } finally {
        await driver.deleteSession();
      }
    });
  });
  describe('cli args handling for empty plugin args', function () {
    /** @type {AppiumServer} */
    let server;
    before(async function () {
      // then start server if we need to
      server = /** @type {AppiumServer} */ (await appiumServer(baseServerArgs));
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });

    describe('when no cli args provided by user', function () {
      it('should receive an empty `cliArgs` object', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
          data.value.should.eql({});
        } finally {
          await driver.deleteSession();
        }
      });
    });
  });

  describe('Execute Methods', function () {
    /** @type {AppiumServer} */
    let server;

    /** @type {import('webdriverio').Browser} */
    let driver;

    before(async function () {
      // then start server if we need to
      const args = {
        appiumHome,
        port,
        address: TEST_HOST,
        usePlugins: ['fake'],
        useDrivers: ['fake'],
      };
      server = /** @type {AppiumServer} */ (await appiumServer(args));
      driver = await wdio(wdOpts);
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
      res.should.eql('Plugged in to electrical');
    });

    it('should handle execute methods overridden on the driver', async function () {
      const res = await driver.executeScript('fake: getThing', []);
      res.should.eql('PLUGIN_FAKE_THING');
    });

    it('should let driver handle unknown execute methods', async function () {
      const sum = await driver.executeScript('fake: addition', [{num1: 2, num2: 3}]);
      sum.should.eql(5);
    });
  });

  describe('BiDi support', function () {
    describe('with a single plugin', function() {
      serverSetup({});
      /** @type {import('webdriverio').Browser} */
      let driver;

      before(async function () {
        driver = await wdio(wdOpts);
      });
      after(async function () {
        if (driver) {
          await driver.deleteSession();
        }
      });

      // TODO write bidi tests
    });
  });
});

/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 */
