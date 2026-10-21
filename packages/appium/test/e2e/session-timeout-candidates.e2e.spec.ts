import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {after, before, beforeEach, describe, it} from 'node:test';

import {errors, routeConfiguringFunction} from '@appium/base-driver';
import {server} from '@appium/http-server';
import type {AppiumServer} from '@appium/types';

import {AppiumDriver} from '../../lib/appium.js';

const ROUTING_CAPS = {platformName: 'Fake', 'appium:automationName': 'Fake'};

describe('New Session timeout validation before driver selection', function () {
  let appiumServer: AppiumServer;
  let url: string;
  let driverLookups = 0;

  before(async function () {
    const appium = new AppiumDriver({} as ConstructorParameters<typeof AppiumDriver>[0]);
    // Stop at the driver-selection boundary: no device, installed driver or session is needed.
    appium.driverConfig = {
      findMatchingDriver: async () => {
        driverLookups++;
        throw new errors.SessionNotCreatedError('synthetic driver-selection boundary');
      },
    } as unknown as typeof appium.driverConfig;
    appiumServer = await server({
      routeConfiguringFunction: routeConfiguringFunction(appium),
      port: 0,
      hostname: '127.0.0.1',
    });
    url = `http://127.0.0.1:${(appiumServer.address() as AddressInfo).port}/session`;
  });

  beforeEach(function () {
    driverLookups = 0;
  });

  after(async function () {
    if (appiumServer) {
      appiumServer.closeAllConnections();
      await appiumServer.close();
    }
  });

  for (const timeouts of [[], '100', {implicit: -1}, {script: '100'}]) {
    for (const location of ['alwaysMatch', 'first', 'last'] as const) {
      it(`returns HTTP 400 for ${JSON.stringify(timeouts)} in ${location} without selecting a driver`, async function () {
        const capabilities =
          location === 'alwaysMatch'
            ? {alwaysMatch: {...ROUTING_CAPS, timeouts}, firstMatch: [{}]}
            : {alwaysMatch: {...ROUTING_CAPS}, firstMatch: location === 'first' ? [{timeouts}, {}] : [{}, {timeouts}]};
        const response = await fetch(url, {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({capabilities}),
        });
        const body = (await response.json()) as {value: {error: string; message: string}};
        assert.equal(response.status, 400);
        assert.equal(body.value.error, 'invalid argument');
        assert.match(body.value.message, /timeouts capability|Invalid (script|pageLoad|implicit) timeout/);
        assert.equal(driverLookups, 0);
      });
    }
  }

  for (const candidate of [
    {timeouts: {script: null, implicit: 0}},
    {timeouts: null},
    {timeouts: {custom: 'ignored'}},
    {'vendor:timeouts': 'opaque'},
  ]) {
    it(`allows ${JSON.stringify(candidate)} to reach the synthetic driver-selection boundary`, async function () {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({capabilities: {alwaysMatch: {...ROUTING_CAPS}, firstMatch: [{}, candidate]}}),
      });
      const body = (await response.json()) as {value: {error: string; message: string}};
      assert.equal(response.status, 500);
      assert.equal(body.value.error, 'session not created');
      assert.match(body.value.message, /synthetic driver-selection boundary/);
      assert.equal(driverLookups, 1);
    });
  }
});
