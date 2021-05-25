import path from 'path';
import {insertAppiumPrefixes} from '../lib/utils';
import getPort from 'get-port';

const TEST_HOST = '127.0.0.1';

const fakeDriverPath = path.dirname(require.resolve('@appium/fake-driver/package.json'));
const PROJECT_ROOT = path.join(fakeDriverPath, '..', '..');
const TEST_FAKE_APP = path.join(fakeDriverPath, 'test', 'fixtures', 'app.xml');

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

let TEST_PORT;
/**
 * Returns a free port; one per process
 * @returns {Promise<number>} a free port
 */
async function getTestPort () {
  return await (TEST_PORT || getPort());
}

export { TEST_FAKE_APP, TEST_HOST, BASE_CAPS, W3C_PREFIXED_CAPS, W3C_CAPS, PROJECT_ROOT, getTestPort };
