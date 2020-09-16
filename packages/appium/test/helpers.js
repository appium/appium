import path from 'path';
import wd from 'wd';
import B from 'bluebird';

const APPIUM_ROOT = path.join(__dirname, '..', 'src');
function requireGulp (importPath) {
  console.log('import', __dirname, path.join(__dirname, importPath));
  return require(path.join(__dirname, '..', 'test', importPath));
}

const {insertAppiumPrefixes} = requireGulp('../build/utils');

const TEST_HOST = 'localhost';
const TEST_PORT = 4723;
const TEST_FAKE_APP = path.resolve(__dirname, '..', '..', 'node_modules',
  'appium-fake-driver', 'test', 'fixtures',
  'app.xml');

function initSession (caps) {
  let resolve = () => {};
  let driver;
  beforeAll(async function () {
    driver = wd.promiseChainRemote({host: TEST_HOST, port: TEST_PORT});
    resolve(driver);
    await driver.init(caps);
  });
  afterAll(async function () {
    await driver.quit();
  });
  return new B((_resolve) => {
    resolve = _resolve;
  });
}

const BASE_CAPS = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP
};
const W3C_PREFIXED_CAPS = {...insertAppiumPrefixes(BASE_CAPS)};
const W3C_CAPS = {
  alwaysMatch: {...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

const {
  DEFAULT_APPIUM_HOME, INSTALL_TYPE_LOCAL, DRIVER_TYPE, INSTALL_TYPES,
  PLUGIN_TYPE
} = require(path.join(APPIUM_ROOT, 'extension-config.js'));

export {
  initSession, requireGulp,
  TEST_FAKE_APP, TEST_HOST, TEST_PORT, BASE_CAPS, W3C_PREFIXED_CAPS,
  W3C_CAPS, DEFAULT_APPIUM_HOME, INSTALL_TYPE_LOCAL, DRIVER_TYPE, INSTALL_TYPES,
  PLUGIN_TYPE
};
