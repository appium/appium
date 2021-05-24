import path from 'path';
import wd from 'wd';


const TEST_HOST = 'localhost';
const TEST_PORT = 4774;
const TEST_APP = path.resolve(__dirname, '..', '..', 'test', 'fixtures', 'app.xml');

const DEFAULT_CAPS = {
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_APP,
  address: 'localhost',
  port: 8181,
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
