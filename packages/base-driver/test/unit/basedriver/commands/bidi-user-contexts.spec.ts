import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {BaseDriver} from '../../../../lib/index.js';

describe('BiDi user-context subscriptions', function () {
  it('should reject unsupported user contexts without broadening existing subscriptions', async function () {
    const driver = new BaseDriver();
    await driver.bidiSubscribe(['log.entryAdded'], ['existing-context']);
    await assert.rejects(
      driver.executeBidiCommand('session.subscribe', {events: ['log.entryAdded'], userContexts: ['user-1']}),
      {error: 'unsupported operation'},
    );
    assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['existing-context']});
  });

  for (const userContexts of [[], [''], 'user-1', [null]]) {
    it(`should reject malformed userContexts: ${JSON.stringify(userContexts)}`, async function () {
      const driver = new BaseDriver();
      await assert.rejects(driver.executeBidiCommand('session.subscribe', {events: ['log.entryAdded'], userContexts}), {
        error: 'invalid argument',
      });
      assert.deepEqual(driver.bidiEventSubs, {});
    });
  }

  it('should reject simultaneous browsing and user context scopes', async function () {
    const driver = new BaseDriver();
    await assert.rejects(
      driver.executeBidiCommand('session.subscribe', {
        events: ['log.entryAdded'],
        contexts: ['context-1'],
        userContexts: ['user-1'],
      }),
      {error: 'invalid argument'},
    );
    assert.deepEqual(driver.bidiEventSubs, {});
  });

  it('should still pass userContexts to a driver-specific subscription implementation', async function () {
    const driver = new BaseDriver();
    const received: unknown[][] = [];
    Object.assign(driver, {
      bidiSubscribe: async (...args: unknown[]) => {
        received.push(args);
        return {subscription: 'driver-owned'};
      },
    });
    await driver.executeBidiCommand('session.subscribe', {events: ['log.entryAdded'], userContexts: ['user-1']});
    assert.deepEqual(received, [[['log.entryAdded'], undefined, ['user-1']]]);
  });

  it('should retain global and browsing-context subscriptions without userContexts', async function () {
    const driver = new BaseDriver();
    await driver.executeBidiCommand('session.subscribe', {events: ['log.entryAdded']});
    await driver.executeBidiCommand('session.subscribe', {events: ['browsingContext.load'], contexts: ['context-1']});
    assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': [''], 'browsingContext.load': ['context-1']});
  });
});
