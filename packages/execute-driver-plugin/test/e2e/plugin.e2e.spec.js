// @ts-check

import path from 'path';

import {pluginE2EHarness} from '@appium/plugin-test-support';
import {remote as wdio} from 'webdriverio';
import {W3C_ELEMENT_KEY, MJSONWP_ELEMENT_KEY} from '../../lib/execute-child';
import {fs} from 'appium/support';

const THIS_PLUGIN_DIR = path.join(__dirname, '..', '..');
const APPIUM_HOME = path.join(THIS_PLUGIN_DIR, 'local_appium_home');
const FAKE_DRIVER_DIR = path.join(THIS_PLUGIN_DIR, '..', 'fake-driver');
const TEST_HOST = 'localhost';
const TEST_FAKE_APP = path.join(
  APPIUM_HOME,
  'node_modules',
  '@appium',
  'fake-driver',
  'test',
  'fixtures',
  'app.xml'
);

const TEST_CAPS = {
  platformName: 'Fake',
  'appium:automationName': 'Fake',
  'appium:deviceName': 'Fake',
  'appium:app': TEST_FAKE_APP,
};
const WDIO_OPTS = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  capabilities: TEST_CAPS,
};

describe('ExecuteDriverPlugin', function () {
  /** @type {import('webdriverio').Browser<'async'>} */
  let driver;

  const basicScript = `return 'foo'`;
  /**
   * @type {import('@appium/plugin-test-support').E2ESetupOpts}
   */
  const e2eSetupOpts = {
    before,
    after,
    host: TEST_HOST,
    driverName: 'fake',
    driverSource: 'local',
    driverSpec: FAKE_DRIVER_DIR,
    pluginName: 'execute-driver',
    pluginSource: 'local',
    pluginSpec: THIS_PLUGIN_DIR,
    appiumHome: APPIUM_HOME,
  };

  after(async function () {
    await fs.rimraf(APPIUM_HOME);
  });

  describe('without --allow-insecure set', function () {
    after(async function () {
      driver && (await driver.deleteSession());
    });
    pluginE2EHarness({...e2eSetupOpts});

    it('should not work unless the allowInsecure feature flag is set', async function () {
      driver = await wdio({...WDIO_OPTS, port: this.port});
      await driver
        .driverScript(basicScript)
        .should.be.rejectedWith(/allow-insecure.+execute_driver_script/i);
    });
  });

  describe('with --allow-insecure set', function () {
    after(async function () {
      driver && (await driver.deleteSession());
    });
    pluginE2EHarness({
      ...e2eSetupOpts,
      serverArgs: {allowInsecure: ['execute_driver_script']},
    });
    before(async function () {
      driver = await wdio({...WDIO_OPTS, port: this.port});
    });

    it('should execute a webdriverio script in the context of session', async function () {
      const script = `
        const timeouts = await driver.getTimeouts();
        const status = await driver.status();
        return [timeouts, status];
      `;
      const expectedTimeouts = {command: 60000, implicit: 0};
      const {result, logs} = await driver.driverScript(script);
      result[0].should.eql(expectedTimeouts);
      result[1].build.should.exist;
      result[1].build.version.should.exist;
      logs.should.eql({error: [], warn: [], log: []});
    });

    it('should fail with any script type other than webdriverio currently', async function () {
      const script = `return 'foo'`;
      await driver.driverScript(script, 'wd').should.be.rejectedWith(/webdriverio/);
    });

    it('should execute a webdriverio script that returns elements correctly', async function () {
      const script = `
        return await driver.$("#Button1");
      `;
      const {result} = await driver.driverScript(script);
      result.should.eql({
        [W3C_ELEMENT_KEY]: '1',
        [MJSONWP_ELEMENT_KEY]: '1',
      });
    });

    it('should execute a webdriverio script that returns elements in deep structure', async function () {
      const script = `
        const el = await driver.$("#Button1");
        return {element: el, elements: [el, el]};
      `;
      const {result} = await driver.driverScript(script);
      const elObj = {
        [W3C_ELEMENT_KEY]: '1',
        [MJSONWP_ELEMENT_KEY]: '1',
      };
      result.should.eql({element: elObj, elements: [elObj, elObj]});
    });

    it('should store and return logs to the user', async function () {
      const script = `
        console.log("foo");
        console.log("foo2");
        console.warn("bar");
        console.error("baz");
        return null;
      `;
      const {logs} = await driver.driverScript(script);
      logs.should.eql({log: ['foo', 'foo2'], warn: ['bar'], error: ['baz']});
    });

    it('should have appium specific commands available', async function () {
      const script = `
        return typeof driver.lock;
      `;
      const {result} = await driver.driverScript(script);
      result.should.eql('function');
    });

    it('should correctly handle errors that happen in a webdriverio script', async function () {
      const script = `
        return await driver.$("~notfound");
      `;
      const {result} = await driver.driverScript(script);
      result.error.error.should.equal('no such element');
      result.error.message.should.match(/element could not be located/);
      result.error.stacktrace.should.includes('NoSuchElementError:');
      result.selector.should.equal('~notfound');
      result.sessionId.should.equal(driver.sessionId);
    });

    it('should correctly handle errors that happen when a script cannot be compiled', async function () {
      const script = `
        return {;
      `;
      await driver
        .driverScript(script)
        .should.be.rejectedWith(/Could not execute driver script.+Unexpected token/);
    });

    it('should be able to set a timeout on a driver script', async function () {
      const script = `
        await Promise.delay(1000);
        return true;
      `;
      await driver
        .driverScript(script, 'webdriverio', 50)
        .should.be.rejectedWith(/.+50.+timeout.+/);
    });
  });
});
