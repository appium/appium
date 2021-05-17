import path from 'path';
import {insertAppiumPrefixes} from '../lib/utils';
import findUp from 'find-up';
import getPort from 'get-port';

const TEST_HOST = '0.0.0.0';
const TEST_PORT = getPort.sync();

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

export { TEST_FAKE_APP, TEST_HOST, TEST_PORT, BASE_CAPS, W3C_PREFIXED_CAPS, W3C_CAPS, PROJECT_ROOT };
