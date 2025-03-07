// @ts-check

import getPort from 'get-port';
import path from 'path';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';
import {insertAppiumPrefixes} from '../lib/utils';

const TEST_HOST = '127.0.0.1';

const FAKE_DRIVER_DIR = path.dirname(require.resolve('@appium/fake-driver/package.json'));

const FAKE_PLUGIN_DIR = path.dirname(require.resolve('@appium/fake-plugin/package.json'));

/**
 * This is the monorepo root.
 */
const PROJECT_ROOT = path.join(FAKE_DRIVER_DIR, '..', '..');

/**
 * Path to Appium package
 */
const APPIUM_ROOT = path.join(PROJECT_ROOT, 'packages', 'appium');

/**
 * Path to fake app fixture `.xml` (as understood by `FakeDriver`)
 */
const TEST_FAKE_APP = path.join(FAKE_DRIVER_DIR, 'test', 'fixtures', 'app.xml');

const BASE_CAPS = {
  automationName: 'Fake',
  platformName: 'Fake',
  deviceName: 'Fake',
  app: TEST_FAKE_APP,
};

const W3C_PREFIXED_CAPS = {...insertAppiumPrefixes(BASE_CAPS)};

/** @type {import('@appium/types').W3CCapabilities} */
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
  FAKE_PLUGIN_DIR,
  APPIUM_ROOT,
};
