// transpile:mocha

import _ from 'lodash';
import path from 'path';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import wd from 'wd';
import axios from 'axios';
import {main as appiumServer} from '../src/main';
import {DEFAULT_APPIUM_HOME, INSTALL_TYPE_LOCAL, DRIVER_TYPE, PLUGIN_TYPE} from '../src/extension-config';
import {TEST_FAKE_APP, TEST_HOST, TEST_PORT} from './helpers';
import {runExtensionCommand} from '../src/cli/extension';

chai.should();
chai.use(chaiAsPromised);
const FAKE_PLUGIN_DIR = path.resolve(__dirname, '..', '..', 'node_modules', '@appium', 'fake-plugin');
const FAKE_DRIVER_DIR = path.resolve(__dirname, '..', '..', 'node_modules', 'appium-fake-driver');

const caps = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP
};

describe('FakePlugin', function () {
  const appiumHome = DEFAULT_APPIUM_HOME;
  const baseUrl = `http://${TEST_HOST}:${TEST_PORT}/wd/hub/session`;
  beforeAll(async function () {
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
        driver: FAKE_DRIVER_DIR,
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
        plugin: FAKE_PLUGIN_DIR,
        installType: INSTALL_TYPE_LOCAL,
      }, PLUGIN_TYPE);
    }
  });

  describe('without plugin registered', function () {
    let server = null;
    beforeAll(async function () {
      // then start server if we need to
      const args = {port: TEST_PORT, host: TEST_HOST, appiumHome, plugins: ['other1', 'other2']};
      server = await appiumServer(args);
    });
    afterAll(async function () {
      if (server) {
        await server.close();
      }
    });
    it('should not update the server if plugin is not activated', async function () {
      await axios.post(`http://${TEST_HOST}:${TEST_PORT}/fake`).should.eventually.be.rejectedWith(/404/);
    });
    it('should not update method map if plugin is not activated', async function () {
      const driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      const [sessionId] = await driver.init(caps);
      try {
        await axios.post(`${baseUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}}).should.eventually.be.rejectedWith(/404/);
      } finally {
        await driver.quit();
      }
    });
    it('should not handle commands if plugin is not activated', async function () {
      const driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
      const [sessionId] = await driver.init(caps);
      try {
        const el = (await axios.post(`${baseUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
        el.should.not.have.property('fake');
      } finally {
        await driver.quit();
      }
    });
  });

  for (const registrationType of ['explicit', 'all']) {
    describe(`with plugin registered via type ${registrationType}`, function () {
      let server = null;
      beforeAll(async function () {
        // then start server if we need to
        const plugins = registrationType === 'explicit' ? ['fake', 'p2', 'p3'] : ['all'];
        const args = {port: TEST_PORT, host: TEST_HOST, appiumHome, plugins};
        server = await appiumServer(args);
      });
      afterAll(async function () {
        if (server) {
          await server.close();
        }
      });
      it('should update the server', async function () {
        const res = {fake: 'fakeResponse'};
        (await axios.post(`http://${TEST_HOST}:${TEST_PORT}/fake`)).data.should.eql(res);
      });

      it('should modify the method map with new commands', async function () {
        const driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
        const [sessionId] = await driver.init(caps);
        try {
          await axios.post(`${baseUrl}/${sessionId}/fake_data`, {data: {fake: 'data'}});
          (await axios.get(`${baseUrl}/${sessionId}/fake_data`)).data.value.should.eql({fake: 'data'});
        } finally {
          await driver.quit();
        }
      });

      it('should handle commands and not call the original', async function () {
        const driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
        const [sessionId] = await driver.init(caps);
        try {
          await driver.source().should.eventually.eql(`<Fake>${JSON.stringify([sessionId])}</Fake>`);
        } finally {
          await driver.quit();
        }
      });

      it('should handle commands and call the original if designed', async function () {
        const driver = wd.promiseChainRemote(TEST_HOST, TEST_PORT);
        const [sessionId] = await driver.init(caps);
        try {
          const el = (await axios.post(`${baseUrl}/${sessionId}/element`, {using: 'xpath', value: '//MockWebView'})).data.value;
          el.should.have.property('fake');
        } finally {
          await driver.quit();
        }
      });
    });
  }
});
