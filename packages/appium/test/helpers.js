import getPort from 'get-port';
import path from 'path';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';

const TEST_HOST = '127.0.0.1';

const FAKE_DRIVER_DIR = path.dirname(require.resolve('@appium/fake-driver/package.json'));
const PROJECT_ROOT = path.join(FAKE_DRIVER_DIR, '..', '..');
const PACKAGE_ROOT = path.join(PROJECT_ROOT, 'packages', 'appium');
const TEST_FAKE_APP = path.join(FAKE_DRIVER_DIR, 'test', 'fixtures', 'app.xml');

/** @type {import('@appium/types').Capabilities} */
const BASE_CAPS = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP,
};

// XXX: Replaced use of `insertAppiumPrefixes()` with this due to TS failures.
// I am not sure what it is about the `utils` module that's causing the issue,
// as I cannot reproduce it outside of an Appium context.  Maybe try again
// in the future??
const W3C_PREFIXED_CAPS = {
  'appium:automationName': 'Fake',
  'appium:platformName': 'Fake',
  'appium:deviceName': 'Fake',
  'appium:app': TEST_FAKE_APP,
};

const W3C_CAPS = {
  alwaysMatch: {...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

let TEST_PORT;
/**
 * Returns a free port; one per process
 * @returns {Promise<number>} a free port
 */
async function getTestPort() {
  return await (TEST_PORT || getPort());
}

/**
 * Resolve a file relative to the `fixtures` dir
 * @param {string} filename - Filename to resolve
 * @param {...string} pathParts - Additional paths to `join()`
 * @returns {string}
 */
function resolveFixture(filename, ...pathParts) {
  return path.join(__dirname, 'fixtures', filename, ...pathParts);
}

overrideEntryPoint(module);
addPlugin(plugins.nodejs);

export {
  TEST_FAKE_APP,
  TEST_HOST,
  BASE_CAPS,
  W3C_PREFIXED_CAPS,
  W3C_CAPS,
  PROJECT_ROOT,
  getTestPort,
  rewiremock,
  resolveFixture,
  FAKE_DRIVER_DIR,
  PACKAGE_ROOT,
};
