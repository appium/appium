import path from 'path';
import { remote as wdio } from 'webdriverio';
import { MATCH_FEATURES_MODE, GET_SIMILARITY_MODE } from '../../lib/compare';
import { TEST_IMG_1_B64, TEST_IMG_2_B64, APPSTORE_IMG_PATH } from '../fixtures';
import { e2eSetup } from '@appium/base-plugin/build/test/helpers';

const THIS_PLUGIN_DIR = path.resolve(__dirname, '..', '..', '..');
const APPIUM_HOME = path.resolve(__dirname, '..', '..', '..', 'local_appium_home');
const TEST_HOST = 'localhost';
const TEST_PORT = 4723;
const TEST_FAKE_APP = path.resolve(APPIUM_HOME, 'node_modules', '@appium', 'fake-driver', 'test', 'fixtures',
                                   'app.xml');
const TEST_CAPS = {
  platformName: 'Fake',
  'appium:automationName': 'Fake',
  'appium:deviceName': 'Fake',
  'appium:app': TEST_FAKE_APP
};
const WDIO_OPTS = {
  hostname: TEST_HOST,
  port: TEST_PORT,
  connectionRetryCount: 0,
  capabilities: TEST_CAPS
};

describe('ImageElementPlugin', function () {
  let server, driver = null;

  after(async function () {
    if (driver) {
      await driver.deleteSession();
    }
  });

  e2eSetup({
    before, after, server, port: TEST_PORT, host: TEST_HOST, appiumHome: APPIUM_HOME,
    driverName: 'fake', driverSource: 'npm', driverSpec: 'appium-fake-driver',
    pluginName: 'images', pluginSource: 'local', pluginSpec: THIS_PLUGIN_DIR,
  });

  it('should add the compareImages route', async function () {
    driver = await wdio(WDIO_OPTS);
    let comparison = await driver.compareImages(MATCH_FEATURES_MODE, TEST_IMG_1_B64, TEST_IMG_2_B64, {});
    comparison.count.should.eql(0);
    comparison = await driver.compareImages(GET_SIMILARITY_MODE, TEST_IMG_1_B64, TEST_IMG_2_B64, {});
    comparison.score.should.be.above(0.2);
  });

  it('should find and interact with image elements', async function () {
    const imageEl = await driver.$(APPSTORE_IMG_PATH);
    const {x, y} = await imageEl.getLocation();
    const {width, height} = await imageEl.getSize();
    x.should.eql(28);
    y.should.eql(72);
    width.should.eql(80);
    height.should.eql(91);
    await imageEl.click();
  });
});
