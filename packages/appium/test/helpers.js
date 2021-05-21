import path from 'path';
import {insertAppiumPrefixes} from '../lib/utils';
import findUp from 'find-up';
import getPort from 'get-port';

const TEST_HOST = 'localhost';

// monorepo root.  this cannot be hardcoded because:
// 1. we may be in 'build/test' or 'test', depending on our config
// 2. Node.js does not support `__dirname` in an ESM context & Babel doesn't fake it well
const PROJECT_ROOT = path.dirname(findUp.sync('.git', {type: 'directory'}));
const TEST_FAKE_APP = path.join(PROJECT_ROOT, 'packages', 'fake-driver', 'test', 'fixtures', 'app.xml');

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
