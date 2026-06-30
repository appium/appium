import { pluginE2EHarness } from '@appium/plugin-test-support';
import { fs, node, tempDir } from '@appium/support';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import sharp from 'sharp';
import { exec } from 'teen_process';
import { remote as wdio } from 'webdriverio';
import { GET_SIMILARITY_MODE, MATCH_FEATURES_MODE } from '../../lib/constants';

use(chaiAsPromised);

const THIS_PLUGIN_DIR = node.getModuleRootSync('@appium/images-plugin', __filename)!;
const APPIUM_HOME = path.join(THIS_PLUGIN_DIR, 'local_appium_home');
const FAKE_DRIVER_DIR = path.join(THIS_PLUGIN_DIR, '..', 'fake-driver');
const FIXTURES_DIR = path.join(THIS_PLUGIN_DIR, 'test', 'fixtures');
const TEST_IMG_1_PATH = path.join(FIXTURES_DIR, 'img1.png');
const TEST_IMG_2_PATH = path.join(FIXTURES_DIR, 'img2.png');
const APPSTORE_IMG_PATH = path.join(FIXTURES_DIR, 'appstore.png');
const TEST_HOST = '127.0.0.1';
const TEST_FAKE_APP = path.join(
  APPIUM_HOME,
  'node_modules',
  '@appium',
  'fake-driver',
  'test',
  'fixtures',
  'app.xml',
);
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

describe('ImageElementPlugin', function() {
  const { setup, teardown } = pluginE2EHarness({
    host: TEST_HOST,
    appiumHome: APPIUM_HOME,
    driverName: 'fake',
    driverSource: 'local',
    driverSpec: FAKE_DRIVER_DIR,
    pluginName: 'images',
    pluginSource: 'local',
    pluginSpec: THIS_PLUGIN_DIR,
  });
  let driver: any;

  before(async function() {
    // workaround for https://github.com/nodejs/node/issues/64061
    await exec(process.execPath, ['--version']);

    const { server } = await setup();
    const address = server.address();
    WDIO_OPTS.port = (address as AddressInfo).port;
  });
  after(async function() {
    await teardown();
  });

  beforeEach(async function() {
    driver = await wdio(WDIO_OPTS);
  });

  afterEach(async function() {
    if (driver) {
      await driver.deleteSession();
    }
  });

  it('should add the compareImages route', async function() {
    const [testImg1b64, testImg2b64] = await Promise.all([
      fs.readFile(TEST_IMG_1_PATH, 'base64'),
      fs.readFile(TEST_IMG_2_PATH, 'base64'),
    ]);
    let comparison = await driver.compareImages(MATCH_FEATURES_MODE, testImg1b64, testImg2b64, {});
    expect(comparison.count).to.eql(0);
    comparison = await driver.compareImages(GET_SIMILARITY_MODE, testImg1b64, testImg2b64, {});
    expect(comparison.score).to.be.above(0.2);
  });

  it('should find and interact with image elements', async function() {
    const imageEl = await driver.$(APPSTORE_IMG_PATH);
    const { x, y } = await imageEl.getLocation();
    const { width, height } = await imageEl.getSize();
    expect(x).to.eql(28);
    expect(y).to.eql(72);
    expect(width).to.eql(80);
    expect(height).to.eql(91);
    await imageEl.click();

    const actionSequence = {
      type: 'pointer',
      id: 'mouse',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', x: 0, y: 0, duration: 0, origin: imageEl },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 125 },
        { type: 'pointerUp', button: 0 },
      ],
    };
    await driver.performActions([actionSequence]);
  });

  it('should find subelements', async function() {
    const imageEl = await driver.$(APPSTORE_IMG_PATH);
    const { width, height } = await imageEl.getSize();
    const tmpRoot = await tempDir.openDir();
    try {
      const screenshotPath = path.join(tmpRoot, 'element.png');
      await imageEl.saveScreenshot(screenshotPath);
      const tmpImgPath = path.join(tmpRoot, 'region.png');
      await sharp(screenshotPath)
        .extract({
          left: parseInt((width / 4).toString(), 10),
          top: parseInt((height / 4).toString(), 10),
          width: parseInt((width / 2).toString(), 10),
          height: parseInt((height / 2).toString(), 10),
        })
        .toFile(tmpImgPath);
      const subEl = await imageEl.$(tmpImgPath);
      expect(subEl).to.not.be.null;
    } finally {
      await fs.rimraf(tmpRoot);
    }
  });
});
