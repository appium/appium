import path from 'path';
import wd from 'wd';
import {existsSync} from 'fs';

const TEST_HOST = '127.0.0.1';
const TEST_PORT = 4774;

// XXX: what dir are we in? it depends on how we're running this test. the .xml file doesn't move, but we do!
// we may be running with @babel/register; otherwise, we're probably in `build/test/` which _does not_ contain the xml file.
const appFixturePath = path.join(__dirname, 'fixtures', 'app.xml');
const TEST_APP = existsSync(appFixturePath) ? appFixturePath : path.join(__dirname, '..', '..', 'test', 'fixtures', 'app.xml');

const DEFAULT_CAPS = {
  platformName: 'Fake',
  'appium:deviceName': 'Commodore 64',
  'appium:app': TEST_APP,
  'appium:address': TEST_HOST,
  'appium:port': 8181,
};

let driver;

async function initSession (caps) {
  driver = wd.promiseChainRemote({host: TEST_HOST, port: TEST_PORT});
  await driver.init(caps);
  return driver;
}

async function deleteSession () {
  try {
    await driver.quit();
  } catch (ign) {}
}

export { initSession, deleteSession, TEST_APP, TEST_HOST, TEST_PORT, DEFAULT_CAPS };
