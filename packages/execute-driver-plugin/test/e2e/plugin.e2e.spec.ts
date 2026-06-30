import path from 'node:path';

import { pluginE2EHarness } from '@appium/plugin-test-support';
import { fs, node } from '@appium/support';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { exec } from 'teen_process';
import { remote as wdio } from 'webdriverio';
import type { Browser } from 'webdriverio';
import { MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY } from '../../lib/execute-child';

use(chaiAsPromised);

const THIS_PLUGIN_DIR = node.getModuleRootSync('@appium/execute-driver-plugin', __filename)!;
const APPIUM_HOME = path.join(THIS_PLUGIN_DIR, 'local_appium_home');
const FAKE_DRIVER_DIR = path.join(THIS_PLUGIN_DIR, '..', 'fake-driver');
const TEST_HOST = '127.0.0.1';
const TEST_FAKE_APP = path.join(APPIUM_HOME, 'node_modules', '@appium', 'fake-driver', 'test', 'fixtures', 'app.xml');

const TEST_CAPS = {
  platformName: 'Fake',
  'appium:automationName': 'Fake',
  'appium:deviceName': 'Fake',
  'appium:app': TEST_FAKE_APP,
};
type WebdriverIOConfig = Parameters<typeof wdio>[0];
const WDIO_OPTS: WebdriverIOConfig = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  capabilities: TEST_CAPS,
};

describe('ExecuteDriverPlugin', function () {
  let driver: Browser;

  const basicScript = `return 'foo'`;
  const e2eSetupOpts = {
    host: TEST_HOST,
    driverName: 'fake',
    driverSource: 'local' as const,
    driverSpec: FAKE_DRIVER_DIR,
    pluginName: 'execute-driver',
    pluginSource: 'local' as const,
    pluginSpec: THIS_PLUGIN_DIR,
    appiumHome: APPIUM_HOME,
  };

  after(async function () {
    await fs.rimraf(APPIUM_HOME);
  });

  describe('without --allow-insecure set', function () {
    let port: number;
    const { setup, teardown } = pluginE2EHarness({ ...e2eSetupOpts });

    before(async function () {
      // workaround for https://github.com/nodejs/node/issues/64061
      await exec(process.execPath, ['--version']);

      const { server } = await setup();
      const address = server.address();
      port = (address as AddressInfo).port;
      driver = await wdio({ ...WDIO_OPTS, port });
    });
    after(async function () {
      try {
        await driver?.deleteSession();
      } finally {
        await teardown();
      }
    });

    it('should not work unless the allowInsecure feature flag is set', async function () {
      await expect(driver.executeDriverScript(basicScript)).to.eventually.be.rejectedWith(
        /allow-insecure.+execute_driver_script/i,
      );
    });
  });

  describe('with --allow-insecure set', function () {
    let port: number;
    const { setup, teardown } = pluginE2EHarness({
      ...e2eSetupOpts,
      serverArgs: { allowInsecure: ['*:execute_driver_script'] },
    });
    before(async function () {
      const { server } = await setup();
      const address = server.address();
      port = (address as AddressInfo).port;
      driver = await wdio({ ...WDIO_OPTS, port });
    });
    after(async function () {
      try {
        await driver?.deleteSession();
      } finally {
        await teardown();
      }
    });

    it('should execute a webdriverio script in the context of session', async function () {
      const script = `
        const timeouts = await driver.getTimeouts();
        const status = await driver.status();
        return [timeouts, status];
      `;
      const expectedTimeouts = { command: 60000, implicit: 0 };
      const { result, logs } = await driver.executeDriverScript(script);
      expect((result as any)[0]).to.eql(expectedTimeouts);
      expect((result as any)[1].build).to.exist;
      expect((result as any)[1].build.version).to.exist;
      expect(logs).to.eql({ error: [], warn: [], log: [] });
    });

    it('should fail with any script type other than webdriverio currently', async function () {
      const script = `return 'foo'`;
      await expect(driver.executeDriverScript(script, 'wd')).to.eventually.be.rejectedWith(/webdriverio/);
    });

    it('should execute a webdriverio script that returns elements correctly', async function () {
      const script = `
        return await driver.$("#Button1");
      `;
      const { result } = await driver.executeDriverScript(script);
      expect(result).to.eql({
        [W3C_ELEMENT_KEY]: '1',
        [MJSONWP_ELEMENT_KEY]: '1',
      });
    });

    it('should execute a webdriverio script that returns elements in deep structure', async function () {
      const script = `
        const el = await driver.$("#Button1");
        return {element: el, elements: [el, el]};
      `;
      const { result } = await driver.executeDriverScript(script);
      const elObj = {
        [W3C_ELEMENT_KEY]: '1',
        [MJSONWP_ELEMENT_KEY]: '1',
      };
      expect(result).to.eql({ element: elObj, elements: [elObj, elObj] });
    });

    it('should store and return logs to the user', async function () {
      const script = `
        console.log("foo");
        console.log("foo2");
        console.warn("bar");
        console.error("baz");
        return null;
      `;
      const { logs } = await driver.executeDriverScript(script);
      expect(logs).to.eql({ log: ['foo', 'foo2'], warn: ['bar'], error: ['baz'] });
    });

    it('should have appium specific commands available', async function () {
      const script = `
        return typeof driver.lock;
      `;
      const { result } = await driver.executeDriverScript(script);
      expect(result).to.eql('function');
    });

    it('should correctly handle errors that happen in a webdriverio script', async function () {
      const script = `
        return await driver.$("~notfound");
      `;
      const { result } = await driver.executeDriverScript(script);
      expect((result as any).error.error).to.equal('no such element');
      expect((result as any).error.message).to.match(/element could not be located/);
      expect((result as any).error.stacktrace).to.include('NoSuchElementError:');
      expect((result as any).selector).to.equal('~notfound');
      expect((result as any).sessionId).to.equal(driver.sessionId);
    });

    it('should correctly handle errors that happen when a script cannot be compiled', async function () {
      const script = `
        return {;
      `;
      await expect(driver.executeDriverScript(script)).to.eventually.be.rejectedWith(
        /Could not execute driver script.+Unexpected token/,
      );
    });

    it('should be able to use standard promise and timeout functions in a driver script', async function () {
      const script = `
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
      `;
      await expect(driver.executeDriverScript(script, 'webdriverio', 50)).to.eventually.be.rejectedWith(
        /.+50.+timeout.+/,
      );
    });
  });
});
