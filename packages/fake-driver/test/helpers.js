import path from 'path';
import {remote as wdio} from 'webdriverio';

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4774;

const TEST_APP = path.join(__dirname, 'fixtures', 'app.xml');

const BASE_CAPS = {
  platformName: 'Fake',
  deviceName: 'Commodore 64',
  app: TEST_APP,
  address: TEST_HOST,
  port: 8181,
};

const W3C_PREFIXED_CAPS = {
  'appium:deviceName': BASE_CAPS.deviceName,
  'appium:app': BASE_CAPS.app,
  'appium:address': BASE_CAPS.address,
  'appium:port': BASE_CAPS.port,
  platformName: BASE_CAPS.platformName,
};

const W3C_CAPS = {
  alwaysMatch: {...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

const WD_OPTS = {
  hostname: TEST_HOST,
  port: TEST_PORT,
  connectionRetryCount: 0,
  logLevel: 'error',
};

async function initSession(w3cPrefixedCaps) {
  return await wdio({...WD_OPTS, capabilities: w3cPrefixedCaps});
}

async function deleteSession(driver) {
  try {
    await driver.deleteSession();
  } catch (ign) {}
}

export {
  initSession,
  deleteSession,
  TEST_APP,
  TEST_HOST,
  TEST_PORT,
  BASE_CAPS,
  W3C_CAPS,
  W3C_PREFIXED_CAPS,
  WD_OPTS,
};
