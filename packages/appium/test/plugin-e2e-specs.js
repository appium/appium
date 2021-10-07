// transpile:mocha
import _ from 'lodash';
import path from 'path';
import { remote as wdio } from 'webdriverio';
import axios from 'axios';
import { main as appiumServer } from '../lib/main';
import { DEFAULT_APPIUM_HOME, INSTALL_TYPE_LOCAL, DRIVER_TYPE, PLUGIN_TYPE } from '../lib/extension-config';
import { W3C_PREFIXED_CAPS, TEST_HOST, getTestPort, PROJECT_ROOT } from './helpers';
import { runExtensionCommand } from '../lib/cli/extension';


const FAKE_ARGS = {sillyWebServerPort: 1234, host: 'hey'};
const FAKE_PLUGIN_ARGS = {fake: FAKE_ARGS};

const wdOpts = {
  hostname: TEST_HOST,
  port: null,
  connectionRetryCount: 0,
  capabilities: W3C_PREFIXED_CAPS,
};

describe('FakePlugin', function () {
  const fakePluginDir = path.join(PROJECT_ROOT, 'node_modules', '@appium', 'fake-plugin');
  const fakeDriverDir = path.join(PROJECT_ROOT, 'packages', 'fake-driver');
  const appiumHome = DEFAULT_APPIUM_HOME;
  let baseArgs;
  let testServer;
  let testPort;
  let baseUrl;

  before(async function () {
    wdOpts.port = testPort = await getTestPort();
    testServer = `http://${TEST_HOST}:${testPort}`;
    baseUrl = `${testServer}/session`;
    // first ensure we have fakedriver installed
    const driverList = await runExtensionCommand({
      appiumHome,
      driverCommand: 'list',
      showInstalled: true,
    }, DRIVER_TYPE);
    if (!_.has(driverList, 'fake')) {
      await runExtensionCommand({
        appiumHome,
        driverCommand: 'install',
        driver: fakeDriverDir,
        installType: INSTALL_TYPE_LOCAL,
      }, DRIVER_TYPE);
    }

    const pluginList = await runExtensionCommand({
      appiumHome,
      pluginCommand: 'list',
      showInstalled: true,
    }, PLUGIN_TYPE);
    if (!_.has(pluginList, 'fake')) {
      await runExtensionCommand({
        appiumHome,
        pluginCommand: 'install',
        plugin: fakePluginDir,
        installType: INSTALL_TYPE_LOCAL,
      }, PLUGIN_TYPE);
    }
    baseArgs = {port: testPort, host: TEST_HOST, appiumHome, plugins: ['fake']};
  });

  describe('without plugin registered', function () {
    let server = null;
    before(async function () {
      // then start server if we need to
      const args = {port: testPort, host: TEST_HOST, appiumHome, plugins: ['other1', 'other2']};
      server = await appiumServer(args);
    });
    after(async function () {
      if (server) {
        await server.close();
      }
    });
    it('should not update the server if plugin is not activated', async function () {
      await axios.post(`http://${TEST_HOST}:${testPort}/fake`).should.eventually.be.rejectedWith(/404/);
    });
    it('should not update method map if plugin is not activated', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        await axios.post(`${baseUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}}).should.eventually.be.rejectedWith(/404/);
      } finally {
        await driver.deleteSession();
      }
    });
    it('should not handle commands if plugin is not activated', async function () {
      const driver = await wdio(wdOpts);
      const {sessionId} = driver;
      try {
        const el = (await axios.post(`${baseUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
        el.should.not.have.property('fake');
      } finally {
        await driver.deleteSession();
      }
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      let server = null;
      before(async function () {
        // then start server if we need to
        const plugins = registrationType === 'explicit' ? ['fake', 'p2', 'p3'] : ['all'];
        const args = {port: testPort, host: TEST_HOST, appiumHome, plugins};
        server = await appiumServer(args);
      });
      after(async function () {
        if (server) {
          await server.close();
        }
      });
      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        (await axios.post(`http://${TEST_HOST}:${testPort}/fake`)).data.should.eql(res);
      });

      it('should modify the method map with new commands', async function () {
        const driver = await wdio(wdOpts);
        const {sessionId} = driver;
        try {
          await axios.post(`${baseUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}});
          (await axios.get(`${baseUrl}/${sessionId}/fake_data`)).data.value.should.eql({fake: 'data'});
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
          const el = (await axios.post(`${baseUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
          el.should.have.property('fake');
        } finally {
          await driver.deleteSession();
        }
      });
    });
  }
  describe('cli args handling for plugin args', function () {
    let server = null;
    before(async function () {
      // then start server if we need to
      const args = {...baseArgs, plugin: FAKE_PLUGIN_ARGS};
      server = await appiumServer(args);
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
        const {data} = await axios.get(`${baseUrl}/${sessionId}/fakepluginargs`);
        data.value.should.eql(FAKE_ARGS);
      } finally {
        await driver.deleteSession();
      }
    });
  });
  describe('cli args handling for empty plugin args', function () {
    let server = null;
    before(async function () {
      // then start server if we need to
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
        const {data} = await axios.get(`${baseUrl}/${sessionId}/fakepluginargs`);
        should.not.exist(data.value);
      } finally {
        await driver.deleteSession();
      }
    });
  });
});
