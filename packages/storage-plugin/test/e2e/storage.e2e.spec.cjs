import _ from 'lodash';
import path from 'node:path';
import {remote as wdio} from 'webdriverio';
import {pluginE2EHarness} from '@appium/plugin-test-support';
import {tempDir, fs} from '@appium/support';
import axios from 'axios';
import { WebSocket } from 'ws';

const BUFFER_SIZE = 0xFFFF;
const THIS_PLUGIN_DIR = path.join(__dirname, '..', '..');
const APPIUM_HOME = path.join(THIS_PLUGIN_DIR, 'local_appium_home');
const FAKE_DRIVER_DIR = path.join(THIS_PLUGIN_DIR, '..', 'fake-driver');
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4725;
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
  port: TEST_PORT,
  connectionRetryCount: 0,
  capabilities: TEST_CAPS,
};

describe('StoragePlugin', function () {
  let server;
  let driver;
  /** @type {string | undefined | undefined} */
  let storageRoot;

  beforeEach(async function () {
    storageRoot = await tempDir.openDir();
    driver = await wdio(WDIO_OPTS);
    const baseUrl = `http://${TEST_HOST}:${TEST_PORT}/storage`;
    driver.addCommand(
      'addStorageItem',
      async (name, sha1) => (await axios.post(
        `${baseUrl}/add`, {name, sha1}
      )).data.value
    );
    driver.addCommand(
      'listStorageItems',
      async () => (await axios.get(`${baseUrl}/list`)).data.value
    );
    driver.addCommand(
      'resetStorageItems',
      async () => (await axios.post(`${baseUrl}/reset`)).data.value
    );
    driver.addCommand(
      'deleteStorageItem',
      async (name) => (await axios.post(`${baseUrl}/delete`, {name})).data.value
    );
  });

  afterEach(async function () {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
    if (storageRoot && await fs.exists(storageRoot)) {
      await fs.rimraf(storageRoot);
      storageRoot = null;
    }
  });

  pluginE2EHarness({
    before,
    after,
    server,
    port: TEST_PORT,
    host: TEST_HOST,
    appiumHome: APPIUM_HOME,
    driverName: 'fake',
    driverSource: 'local',
    driverSpec: FAKE_DRIVER_DIR,
    pluginName: 'storage',
    pluginSource: 'local',
    pluginSpec: THIS_PLUGIN_DIR,
  });

  it('should manage storage files', async function () {
    let items = await driver.listStorageItems();
    _.isEmpty(items).should.be.true;
    const name1 = path.basename('foo1.bar');
    const name2 = path.basename('foo2.bar');
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    await Promise.all([
      addFileToStorage(TEST_FAKE_APP, name1),
      addFileToStorage(pkgPath, name2),
    ]);
    items = await driver.listStorageItems();
    items.length.should.eql(2);
    _.isEqual(new Set(items.map(({name}) => name)), new Set([name1, name2])).should.be.true;
    const isDeleted = await driver.deleteStorageItem(name1);
    isDeleted.should.be.true;
    items = await driver.listStorageItems();
    items.length.should.eql(1);
    items[0].name.should.eql(name2);
    await driver.resetStorageItems();
    items = await driver.listStorageItems();
    items.length.should.eql(0);
  });

  async function addFileToStorage(sourcePath, name) {
    const hash = await fs.hash(sourcePath);
    const {size} = await fs.stat(sourcePath);
    const {ws: {events, stream}} = await driver.addStorageItem(name, hash, sourcePath);
    const streamWs = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}${stream}`);
    const eventsWs = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}${events}`);
    try {
      await new Promise((resolve, reject) => {
        streamWs.once('error', reject);
        eventsWs.once('error', reject);
        eventsWs.once('message', async (data) => {
          let strData;
          if (_.isBuffer(data)) {
            strData = data.toString();
          } else if (_.isString(data)) {
            strData = data;
          } else {
            return;
          }
          try {
            const {value} = JSON.parse(strData);
            if (value?.success) {
              resolve(true);
            } else {
              reject(new Error(JSON.stringify(value)));
            }
          } catch {}
        });
        streamWs.once('open', async () => {
          const fhandle = await fs.openFile(sourcePath, 'r');
          try {
            let bytesRead = 0;
            while (bytesRead < size) {
              const bufferSize = Math.min(BUFFER_SIZE, size - bytesRead);
              const buffer = Buffer.alloc(bufferSize);
              await fhandle.read(buffer, 0, bufferSize, bytesRead);
              streamWs.send(buffer);
              bytesRead += bufferSize;
            }
          } catch (e) {
            reject(e);
          } finally {
            await fhandle.close();
            streamWs.close();
          }
        });
      });
    } finally {
      streamWs.close();
      eventsWs.close();
    }
  }
});
