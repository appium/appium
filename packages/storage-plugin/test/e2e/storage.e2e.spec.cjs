import _ from 'lodash';
import path from 'path';
import {remote as wdio} from 'webdriverio';
import {pluginE2EHarness} from '@appium/plugin-test-support';
import {tempDir, fs} from '@appium/support';

const BUFFER_SIZE = 0xFFF;

const THIS_PLUGIN_DIR = path.join(__dirname, '..', '..');
const APPIUM_HOME = path.join(THIS_PLUGIN_DIR, 'local_appium_home');
const FAKE_DRIVER_DIR = path.join(THIS_PLUGIN_DIR, '..', 'fake-driver');
const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4723;
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
  webSocketUrl: true,
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
    let {result: items} = await driver.send({method: 'appium:storage.list', params: {}});
    _.isEmpty(items).should.be.true;
    const name1 = path.basename('foo1.bar');
    const name2 = path.basename('foo2.bar');
    await Promise.all([
      addFileToStorage(TEST_FAKE_APP, name1),
      addFileToStorage(TEST_FAKE_APP, name2),
    ]);
    ({result: items} = await driver.send({method: 'appium:storage.list', params: {}}));
    items.length.should.eql(2);
    _.isEqual(new Set(items.map(({name}) => name)), new Set([name1, name2])).should.be.true;
    let {result} = await driver.send({method: 'appium:storage.delete', params: {name: name1}});
    result.should.be.true;
    ({result: items} = await driver.send({method: 'appium:storage.list', params: {}}));
    items.length.should.eql(1);
    items[0].name.should.eql(name2);
    await driver.send({method: 'appium:storage.reset', params: {}});
    ({result: items} = await driver.send({method: 'appium:storage.list', params: {}}));
    items.length.should.eql(0);
  });

  async function addFileToStorage(sourcePath, name) {
    const {size} = await fs.stat(sourcePath);
    const hash = await fs.hash(sourcePath);
    let bytesRead = 0;
    const readHandle = await fs.openFile(sourcePath, 'r');
    try {
      while (bytesRead < size) {
        const bufferSize = Math.min(BUFFER_SIZE, size - bytesRead);
        const buffer = Buffer.alloc(bufferSize);
        await readHandle.read(buffer, 0, buffer.length, bytesRead);
        await driver.send({method: 'appium:storage.upload', params: {
          name,
          hash,
          size,
          chunk: buffer.toString('base64'),
          position: bytesRead,
        }});
        bytesRead += bufferSize;
      }
    } finally {
      await readHandle.close();
    }
  }
});
