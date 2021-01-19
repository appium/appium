import path from 'path';
import {insertAppiumPrefixes} from '../lib/utils';

const TEST_HOST = 'localhost';
const TEST_PORT = 4723;
const TEST_FAKE_APP = path.resolve(__dirname, '..', '..', 'node_modules',
                                   'appium-fake-driver', 'test', 'fixtures',
                                   'app.xml');

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

export { TEST_FAKE_APP, TEST_HOST, TEST_PORT, BASE_CAPS, W3C_PREFIXED_CAPS, W3C_CAPS };
