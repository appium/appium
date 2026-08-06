import assert from 'node:assert/strict';
import {after, afterEach, before, describe, it} from 'node:test';

import {TEST_HOST} from '@appium/driver-test-support';

import {WebDriverProxy} from '../../../lib';
import {createServer} from '../../helpers';
import {FakeDriver} from '../protocol/fake-driver';

describe('proxy', function () {
  let wdproxy: WebDriverProxy;
  let teardown: () => Promise<void> | undefined;

  before(async function () {
    const {port, setup, teardown: teardownFn} = await createServer(new FakeDriver());
    teardown = teardownFn;
    await setup();
    wdproxy = new WebDriverProxy({server: TEST_HOST, port});
  });

  after(async function () {
    await teardown?.();
  });

  it('should proxy status straight', async function () {
    const [res, resBody] = await wdproxy.proxy('/status', 'GET');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(resBody.value, `I'm fine`);
  });
  it('should proxy status as command', async function () {
    const res = await wdproxy.command('/status', 'GET');
    assert.strictEqual(res, `I'm fine`);
  });
  describe('new session', function () {
    afterEach(async function () {
      await wdproxy.command('', 'DELETE');
    });
    it('should start a new session', async function () {
      const caps = {browserName: 'fake'};
      const res = await wdproxy.command('/session', 'POST', {
        capabilities: {alwaysMatch: caps},
      });
      assert.ok(Object.hasOwn(res.capabilities.alwaysMatch, 'browserName'));
      assert.strictEqual(wdproxy.sessionId!.length, 48);
    });
  });
  describe('delete session', function () {
    it('should quit a session', async function () {
      await wdproxy.command('/session', 'POST', {
        capabilities: {alwaysMatch: {browserName: 'fake'}},
      });
      const res = await wdproxy.command('', 'DELETE');
      assert.ok(!res);
    });
  });
});
