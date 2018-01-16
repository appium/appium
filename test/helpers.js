import path from 'path';
import wd from 'wd';
import B from 'bluebird';
import {insertAppiumPrefixes} from '../lib/utils';

const TEST_HOST = 'localhost';
const TEST_PORT = 4723;
const TEST_FAKE_APP = path.resolve(__dirname, "..", "..", "node_modules",
                                   "appium-fake-driver", "test", "fixtures",
                                   "app.xml");

function initSession (caps) {
  let resolve = () => {};
  let driver;
  before(async () => {
    driver = wd.promiseChainRemote({host: TEST_HOST, port: TEST_PORT});
    resolve(driver);
    await driver.init(caps);
  });
  after(async () => {
    await driver.quit();
  });
  return new B((_resolve) => {
    resolve = _resolve;
  });
}

const BASE_CAPS = {platformName: 'Fake', deviceName: 'Fake', app: TEST_FAKE_APP};
const W3C_PREFIXED_CAPS = {...insertAppiumPrefixes(BASE_CAPS)};
const W3C_CAPS = {
  alwaysMatch:{...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

export { initSession, TEST_FAKE_APP, TEST_HOST, TEST_PORT, BASE_CAPS, W3C_PREFIXED_CAPS, W3C_CAPS };
