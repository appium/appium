import net from 'node:net';
import path from 'node:path';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';
import {insertAppiumPrefixes} from '../lib/helpers/capability';

const TEST_HOST = '127.0.0.1';

const FAKE_DRIVER_DIR = path.dirname(require.resolve('@appium/fake-driver/package.json'));
const FAKE_PLUGIN_DIR = path.dirname(require.resolve('@appium/fake-plugin/package.json'));

/** This is the monorepo root. */
const PROJECT_ROOT = path.join(FAKE_DRIVER_DIR, '..', '..');

/** Path to Appium package */
const APPIUM_ROOT = path.join(PROJECT_ROOT, 'packages', 'appium');

/** Path to fake app fixture `.xml` (as understood by `FakeDriver`) */
const TEST_FAKE_APP = path.join(FAKE_DRIVER_DIR, 'test', 'fixtures', 'app.xml');

const BASE_CAPS = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP,
};

const W3C_PREFIXED_CAPS = {...insertAppiumPrefixes(BASE_CAPS)};

const W3C_CAPS = {
  alwaysMatch: {...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

let TEST_PORT: number | undefined;

async function getPort(): Promise<number> {
  const server = net.createServer();
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, TEST_HOST, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not resolve a free port')));
        return;
      }
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}

async function getTestPort(): Promise<number> {
  return (TEST_PORT ??= await getPort());
}

function resolveFixture(filename: string, ...pathParts: string[]): string {
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
  FAKE_PLUGIN_DIR,
  APPIUM_ROOT,
};
