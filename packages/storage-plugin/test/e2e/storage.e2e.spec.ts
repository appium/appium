import { pluginE2EHarness } from '@appium/plugin-test-support';
import { fs, node, tempDir } from '@appium/support';
import axios from 'axios';
import { expect } from 'chai';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { exec } from 'teen_process';
import { remote as wdio } from 'webdriverio';
import { WebSocket } from 'ws';

const BUFFER_SIZE = 0xffff;
const THIS_PLUGIN_DIR = node.getModuleRootSync('@appium/storage-plugin', __filename)!;
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

describe('StoragePlugin', function () {
  let driver: any;
  let storageRoot: string | undefined;
  const { setup, teardown } = pluginE2EHarness({
    host: TEST_HOST,
    appiumHome: APPIUM_HOME,
    driverName: 'fake',
    driverSource: 'local',
    driverSpec: FAKE_DRIVER_DIR,
    pluginName: 'storage',
    pluginSource: 'local',
    pluginSpec: THIS_PLUGIN_DIR,
  });
  before(async function () {
    // workaround for https://github.com/nodejs/node/issues/64061
    await exec(process.execPath, ['--version']);

    const { server } = await setup();
    const address = server.address();
    WDIO_OPTS.port = (address as AddressInfo).port;
  });
  after(async function () {
    await teardown();
  });

  beforeEach(async function () {
    storageRoot = await tempDir.openDir();
    driver = await wdio(WDIO_OPTS);
    const baseUrl = `http://${TEST_HOST}:${WDIO_OPTS.port}/storage`;
    driver.addCommand(
      'addStorageItem',
      async (name: string, sha1: string) => (await axios.post(`${baseUrl}/add`, { name, sha1 })).data.value,
    );
    driver.addCommand('listStorageItems', async () => (await axios.get(`${baseUrl}/list`)).data.value);
    driver.addCommand('resetStorageItems', async () => (await axios.post(`${baseUrl}/reset`)).data.value);
    driver.addCommand(
      'deleteStorageItem',
      async (name: string) => (await axios.post(`${baseUrl}/delete`, { name })).data.value,
    );
  });

  afterEach(async function () {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
    if (storageRoot && (await fs.exists(storageRoot))) {
      await fs.rimraf(storageRoot);
      storageRoot = undefined;
    }
  });

  it('should manage storage files', async function () {
    let items = await driver.listStorageItems();
    expect(items).to.be.empty;
    const name1 = path.basename('foo1.bar');
    const name2 = path.basename('foo2.bar');
    const pkgPath = path.join(THIS_PLUGIN_DIR, 'package.json');
    await Promise.all([addFileToStorage(TEST_FAKE_APP, name1), addFileToStorage(pkgPath, name2)]);
    items = await driver.listStorageItems();
    expect(items.length).to.eql(2);
    expect(new Set(items.map(({ name }: { name: string }) => name))).to.deep.equal(new Set([name1, name2]));
    const isDeleted = await driver.deleteStorageItem(name1);
    expect(isDeleted).to.be.true;
    items = await driver.listStorageItems();
    expect(items.length).to.eql(1);
    expect(items[0].name).to.eql(name2);
    await driver.resetStorageItems();
    items = await driver.listStorageItems();
    expect(items.length).to.eql(0);
  });

  async function addFileToStorage(sourcePath: string, name: string): Promise<void> {
    const hash = await fs.hash(sourcePath);
    const { size } = await fs.stat(sourcePath);
    const {
      ws: { events, stream },
    } = await driver.addStorageItem(name, hash, sourcePath);
    const streamWs = new WebSocket(`ws://${TEST_HOST}:${WDIO_OPTS.port}${stream}`);
    const eventsWs = new WebSocket(`ws://${TEST_HOST}:${WDIO_OPTS.port}${events}`);
    try {
      await new Promise<void>((resolve, reject) => {
        streamWs.once('error', reject);
        eventsWs.once('error', reject);
        eventsWs.once('message', async (data: Buffer | string) => {
          let strData: string;
          if (Buffer.isBuffer(data)) {
            strData = data.toString();
          } else if (typeof data === 'string') {
            strData = data;
          } else {
            return;
          }
          try {
            const { value } = JSON.parse(strData);
            if (value?.success) {
              resolve();
            } else {
              reject(new Error(JSON.stringify(value)));
            }
          } catch {
            // ignore
          }
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
