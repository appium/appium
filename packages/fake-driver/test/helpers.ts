import path from 'node:path';

import {TEST_HOST} from '@appium/driver-test-support';
import type {Constraints, StringRecord, W3CCapabilities} from '@appium/types';
import {remote as wdio} from 'webdriverio';

const TEST_APP = path.join(__dirname, 'fixtures', 'app.xml');

const BASE_CAPS: StringRecord = {
  platformName: 'Fake',
  deviceName: 'Commodore 64',
  app: TEST_APP,
};

const W3C_PREFIXED_CAPS: StringRecord = {
  'appium:deviceName': BASE_CAPS.deviceName,
  'appium:app': BASE_CAPS.app,
  platformName: BASE_CAPS.platformName,
};

const W3C_CAPS: W3CCapabilities<Constraints> = {
  alwaysMatch: {...W3C_PREFIXED_CAPS},
  firstMatch: [{}],
};

const WD_OPTS: Partial<Parameters<typeof wdio>[0]> = {
  hostname: TEST_HOST,
  connectionRetryCount: 0,
  logLevel: 'error',
};

async function initSession(w3cPrefixedCaps: StringRecord, wdioOpts: Partial<Parameters<typeof wdio>[0]> = {}) {
  return await wdio({...WD_OPTS, ...wdioOpts, capabilities: w3cPrefixedCaps});
}

async function deleteSession(driver: Awaited<ReturnType<typeof wdio>>) {
  try {
    await driver.deleteSession();
  } catch {
    // ignore
  }
}

export {BASE_CAPS, deleteSession, initSession, TEST_APP, TEST_HOST, W3C_CAPS, W3C_PREFIXED_CAPS};
