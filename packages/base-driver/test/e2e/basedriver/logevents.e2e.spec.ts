import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import type {Constraints, Driver, EventHistoryCommand} from '@appium/types';
import axios from 'axios';
import {createSandbox} from 'sinon';

import {createServer} from '../../helpers.js';
import {MockExecuteDriver} from '../protocol/mock-execute-driver.js';

describe('Execute Command Test', function () {
  let sandbox: sinon.SinonSandbox;
  let driver: MockExecuteDriver;
  let baseUrl: string;
  let teardown: () => Promise<void> | undefined;

  beforeEach(async function () {
    sandbox = createSandbox();
    driver = new MockExecuteDriver();
    driver.sessionId = 'foo';

    const {
      setup,
      teardown: teardownFn,
      baseUrl: baseUrlStr,
    } = await createServer(driver as unknown as Driver<Constraints>);
    baseUrl = baseUrlStr;
    teardown = teardownFn;
    await setup();
  });

  afterEach(async function () {
    sandbox.restore();
    await teardown?.();
  });

  it('should rename extended command and log it in event history', async function () {
    const script = 'mobile: activateApp';
    const args = [{appId: 'io.appium.TestApp'}];

    const res = await axios.post(`${baseUrl}/session/foo/execute/sync`, {
      script,
      args,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Object.hasOwn(res.data, 'value'));
    assert.deepStrictEqual(res.data.value, {executed: script, args});

    const events = await driver.getLogEvents();
    const command = (events.commands as EventHistoryCommand[])[0];

    assert.strictEqual(command.cmd, 'mobileActivateApp');
  });
});
