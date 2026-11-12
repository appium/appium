import assert from 'node:assert/strict';
import {after, afterEach, before, describe, it} from 'node:test';

import {routeConfiguringFunction, server} from '@appium/base-driver';
import {FakeDriver} from '@appium/fake-driver';
import type {AppiumServer, DriverOpts} from '@appium/types';
import axios from 'axios';

import {AppiumDriver, type AppiumDriverConstraints} from '../../lib/appium';
import type {DriverConfig} from '../../lib/extension/driver-config';
import {finalizeSchema, resetSchema} from '../../lib/schema';
import {getTestPort, TEST_FAKE_APP, TEST_HOST} from '../helpers';

describe('Appium capability schemas via HTTP', function () {
  class SchemaFakeDriver extends FakeDriver {
    readonly desiredCapSchema = {
      type: 'object',
      properties: {count: {type: 'integer', minimum: 1}},
      required: ['count'],
    } as const;
  }

  let appium: AppiumDriver;
  let httpServer: AppiumServer;
  let baseUrl: string;

  before(async function () {
    resetSchema();
    await finalizeSchema();
    const port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
    appium = new AppiumDriver({address: TEST_HOST, port} as DriverOpts<AppiumDriverConstraints>);
    // Use a known local driver so this test exercises session routing without installing extensions.
    appium.driverConfig = {
      findMatchingDriver: async () => ({driver: SchemaFakeDriver, version: '1.0.0', driverName: 'fake'}),
    } as unknown as DriverConfig;
    httpServer = await server({routeConfiguringFunction: routeConfiguringFunction(appium), port, hostname: TEST_HOST});
    appium.server = httpServer;
  });

  afterEach(async function () {
    await appium.deleteAllSessions();
  });

  after(async function () {
    await httpServer?.close();
    resetSchema();
  });

  it('preserves fallback candidates through Appium routing and starts the real fake driver', async function () {
    const response = await axios.post(`${baseUrl}/session`, {
      capabilities: {
        alwaysMatch: {
          platformName: 'Fake',
          'appium:automationName': 'Fake',
          'appium:app': TEST_FAKE_APP,
        },
        firstMatch: [{'appium:count': 0}, {'appium:options': {count: 2}}],
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.value.capabilities.count, 2);
    const sessionId = response.data.value.sessionId;
    assert.ok(appium.sessions[sessionId] instanceof SchemaFakeDriver);
    assert.equal((appium.sessions[sessionId].caps as Record<string, unknown>)?.count, 2);
  });

  it('does not accept a later candidate for a different driver route', async function () {
    const response = await axios.post(
      `${baseUrl}/session`,
      {
        capabilities: {
          alwaysMatch: {'appium:app': TEST_FAKE_APP},
          firstMatch: [
            {platformName: 'Fake', 'appium:automationName': 'Fake', 'appium:count': 0},
            {platformName: 'Other', 'appium:automationName': 'Other', 'appium:count': 2},
          ],
        },
      },
      {validateStatus: () => true},
    );
    assert.equal(response.status, 500);
    assert.match(response.data.value.message, /\/count.*>= 1/);
    assert.deepEqual(Object.keys(appium.sessions), []);
  });
});
