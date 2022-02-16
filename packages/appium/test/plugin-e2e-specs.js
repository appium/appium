// @ts-check

// transpile:mocha
import _ from 'lodash';
import path from 'path';
import B from 'bluebird';
import { remote as wdio } from 'webdriverio';
import axios from 'axios';
import { main as appiumServer } from '../lib/main';
import { INSTALL_TYPE_LOCAL } from '../lib/extension/extension-config';
import { W3C_PREFIXED_CAPS, TEST_HOST, getTestPort, PROJECT_ROOT } from './helpers';
import { runExtensionCommand } from '../lib/cli/extension';
import { tempDir, fs } from '@appium/support';
import { loadExtensions } from '../lib/extension';

const FAKE_ARGS = {sillyWebServerPort: 1234, host: 'hey'};
const FAKE_PLUGIN_ARGS = {fake: FAKE_ARGS};

const should = chai.should();

/** @type {WebdriverIO.RemoteOptions} */
const wdOpts = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  capabilities: W3C_PREFIXED_CAPS,
};
const FAKE_DRIVER_DIR = path.join(PROJECT_ROOT, 'packages', 'fake-driver');
const FAKE_PLUGIN_DIR = path.join(PROJECT_ROOT, 'node_modules', '@appium', 'fake-plugin');

describe('FakePlugin', function () {
  /** @type {string} */
  let appiumHome;
  /** @type {Partial<import('../types/types').ParsedArgs>} */
  let baseArgs;
  /** @type {string} */
  let testServerBaseUrl;
  /** @type {number} */
  let port;
  /** @type {string} */
  let testServerBaseSessionUrl;

  before(async function () {
    appiumHome = await tempDir.openDir();
    wdOpts.port = port = await getTestPort();
    testServerBaseUrl = `http://${TEST_HOST}:${port}`;
    testServerBaseSessionUrl = `${testServerBaseUrl}/session`;
    const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);
    // first ensure we have fakedriver installed
    const driverList = await runExtensionCommand({
      driverCommand: 'list',
      showInstalled: true,
    }, driverConfig
    );
    if (!_.has(driverList, 'fake')) {
      await runExtensionCommand({
        driverCommand: 'install',
        driver: FAKE_DRIVER_DIR,
        installType: INSTALL_TYPE_LOCAL,
      }, driverConfig
      );
    }

    const pluginList = await runExtensionCommand({
      pluginCommand: 'list',
      showInstalled: true,
    }, pluginConfig);
    if (!_.has(pluginList, 'fake')) {
      await runExtensionCommand({
        pluginCommand: 'install',
        plugin: FAKE_PLUGIN_DIR,
        installType: INSTALL_TYPE_LOCAL,
      }, pluginConfig);
    }
    baseArgs = {
      appiumHome,
      port,
      address: TEST_HOST,
      usePlugins: ['fake'],
      useDrivers: ['fake']
    };
  });

  after(async function () {
    await fs.rimraf(appiumHome);
  });

  describe('without plugin registered', function () {
    /** @type {import('http').Server} */
    let server;

    before(async function () {
      const args = {appiumHome, port, address: TEST_HOST, usePlugins: ['other1', 'other2']};
      server = /** @type {typeof server} */(
        // @ts-expect-error
        await appiumServer(args)
      );
    });

    after(async function () {
      if (server) {
        await server.close();
      }
    });

    it('should not update the server if plugin is not activated', async function () {
      await axios.post(`http://${TEST_HOST}:${port}/fake`).should.eventually.be.rejectedWith(/404/);
    });
    it('should not update method map if plugin is not activated', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}}).should.eventually.be.rejectedWith(/404/);
      } finally {
        await driver.deleteSession();
      }
    });
    it('should not handle commands if plugin is not activated', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        const el = (await axios.post(`${testServerBaseSessionUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
        el.should.not.have.property('fake');
      } finally {
        await driver.deleteSession();
      }
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      /** @type {import('http').Server} */
      let server;
      before(async function () {
        // then start server if we need to
        const usePlugins = registrationType === 'explicit' ? ['fake', 'p2', 'p3'] : ['all'];
        const args = {appiumHome, port, address: TEST_HOST, usePlugins, useDrivers: ['fake']};
        server = /** @type {typeof server} */(
          // @ts-expect-error
          await appiumServer(args)
        );
      });
      after(async function () {
        if (server) {
          await server.close();
        }
      });
      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        (await axios.post(`http://${TEST_HOST}:${port}/fake`)).data.should.eql(res);
      });

      it('should modify the method map with new commands', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}});
          (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fake_data`)).data.value.should.eql({fake: 'data'});
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and not call the original', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await driver.getPageSource().should.eventually.eql(`<Fake>${JSON.stringify([sessionId])}</Fake>`);
        } finally {
          await driver.deleteSession();
        }
      });

      it('should handle commands and call the original if designed', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          const el = (await axios.post(`${testServerBaseSessionUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
          el.should.have.property('fake');
        } finally {
          await driver.deleteSession();
        }
      });

      it('should allow original command to be proxied if supported', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {name: 'PROXY'});
          const handle = (await axios.get(`${testServerBaseSessionUrl}/${sessionId}/window/handle`)).data.value;
          handle.should.eql('<<proxied via proxyCommand>>');
        } finally {
          await axios.post(`${testServerBaseSessionUrl}/${sessionId}/context`, {name: 'NATIVE_APP'});
          await driver.deleteSession();
        }
      });

      it('should handle unexpected driver shutdown', async function () {
        /** @type {WebdriverIO.RemoteOptions} */
        const newOpts = {...wdOpts};
        newOpts.capabilities = {...newOpts.capabilities ?? {}, 'appium:newCommandTimeout': 1};
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
    });
  }
  describe('cli args handling for plugin args', function () {
    /** @type {import('http').Server} */
    let server;
    before(async function () {
      // then start server if we need to
      const args = {...baseArgs, plugin: FAKE_PLUGIN_ARGS};
      server = /** @type {typeof server} */(
        // @ts-expect-error
        await appiumServer(args)
      );
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
    /** @type {import('http').Server} */
    let server;
    before(async function () {
      // then start server if we need to
      // @ts-expect-error
      server = await appiumServer(baseArgs);
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });

    it('should not receive user cli args for plugin if none were passed in', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        const {data} = await axios.get(`${testServerBaseSessionUrl}/${sessionId}/fakepluginargs`);
        should.not.exist(data.value);
      } finally {
        await driver.deleteSession();
      }
    });
  });
});
