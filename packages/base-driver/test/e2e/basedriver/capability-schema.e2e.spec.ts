import assert from 'node:assert/strict';
import {after, afterEach, before, describe, it} from 'node:test';

import type {Constraints, InitialOpts} from '@appium/types';
import axios from 'axios';

import {BaseDriver} from '../../../lib';
import {createServer} from '../../helpers';

describe('capability schema HTTP sessions', function () {
  class SchemaDriver extends BaseDriver<Constraints> {
    readonly desiredCapSchema = {
      type: 'object',
      properties: {count: {type: 'integer', minimum: 1}},
      required: ['count'],
    } as const;
  }

  const driver = new SchemaDriver({} as InitialOpts);
  let baseUrl: string;
  let teardown: () => Promise<void>;

  before(async function () {
    const server = await createServer(driver);
    baseUrl = server.baseUrl;
    teardown = server.teardown;
    await server.setup();
  });

  afterEach(async function () {
    if (driver.sessionId) {
      await axios.delete(`${baseUrl}/session/${driver.sessionId}`);
    }
  });

  after(async function () {
    await teardown?.();
  });

  it('selects a schema-valid candidate through POST /session', async function () {
    const response = await axios.post(`${baseUrl}/session`, {
      capabilities: {
        alwaysMatch: {platformName: 'fake'},
        firstMatch: [{'appium:count': 0}, {'appium:options': {count: 2}}],
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.value.capabilities.count, 2);
    assert.equal(response.data.value.sessionId, driver.sessionId);
  });

  it('returns a protocol error for an invalid candidate without creating a session', async function () {
    const response = await axios.post(
      `${baseUrl}/session`,
      {
        capabilities: {alwaysMatch: {platformName: 'fake', 'appium:count': '2'}},
      },
      {validateStatus: () => true},
    );
    assert.equal(response.status, 500);
    assert.equal(response.data.value.error, 'session not created');
    assert.match(response.data.value.message, /\/count.*integer/);
    assert.equal(driver.sessionId, null);
  });
});
