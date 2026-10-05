import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../../lib/index.js';

describe('bidi commands -', function () {
  let driver: BaseDriver<any, any, any, any, any>;

  beforeEach(function () {
    driver = new BaseDriver({} as InitialOpts);
  });

  describe('bidiUnsubscribe', function () {
    it('should return unique IDs and remove only the selected overlapping subscription', async function () {
      const first = await driver.executeBidiCommand('session.subscribe', {events: ['log.entryAdded'], contexts: ['a']});
      const second = await driver.executeBidiCommand('session.subscribe', {
        events: ['log.entryAdded'],
        contexts: ['a', 'b'],
      });
      assert.equal(typeof first.subscription, 'string');
      assert.notEqual(first.subscription, second.subscription);
      assert.deepEqual(
        await driver.executeBidiCommand('session.unsubscribe', {subscriptions: [first.subscription]}),
        {},
      );
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['a', 'b']});
      await driver.executeBidiCommand('session.unsubscribe', {subscriptions: [second.subscription]});
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should validate every ID before removing any subscriptions', async function () {
      const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
      await assert.rejects(
        driver.executeBidiCommand('session.unsubscribe', {subscriptions: [subscription, 'missing']}),
        /Unknown subscription/,
      );
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});
      await driver.executeBidiCommand('session.unsubscribe', {subscriptions: [subscription, subscription]});
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should preserve the legacy event form without confusing events and IDs', async function () {
      const {subscription} = await driver.bidiSubscribe(['log.entryAdded'], ['a', 'b']);
      await driver.executeBidiCommand('session.unsubscribe', {events: ['log.entryAdded'], contexts: ['a']});
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['b']});
      await driver.executeBidiCommand('session.unsubscribe', {subscriptions: [subscription]});
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should reject mixed ID and event requests before mutating subscriptions', async function () {
      const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
      for (const extra of [{events: ['log.entryAdded']}, {contexts: ['a']}]) {
        await assert.rejects(
          driver.executeBidiCommand('session.unsubscribe', {subscriptions: [subscription], ...extra}),
          /cannot be combined/,
        );
      }
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});
    });

    it('should reject mixed arguments in direct ID-based unsubscribe calls without removing subscriptions', async function () {
      const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
      for (const contexts of [[], [''], ['a']]) {
        await assert.rejects(driver.bidiUnsubscribe(undefined, contexts, [subscription]), /cannot be combined/);
      }
      await assert.rejects(driver.bidiUnsubscribe(['log.entryAdded'], undefined, [subscription]), /cannot be combined/);
      assert.deepEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});
      await driver.bidiUnsubscribe(undefined, undefined, [subscription]);
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should default legacy unsubscribe to the global context', async function () {
      await driver.bidiSubscribe(['log.entryAdded']);
      await driver.bidiUnsubscribe(['log.entryAdded']);
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should safely aggregate event names matching Object prototype properties', async function () {
      const events = ['__proto__', 'constructor', 'hasOwnProperty'];
      const first = await driver.bidiSubscribe(events, ['a']);
      const second = await driver.bidiSubscribe(events, ['a', 'b']);
      assert.deepEqual(driver.bidiEventSubs, Object.fromEntries(events.map((event) => [event, ['a', 'b']])));
      assert.equal(Object.getPrototypeOf(driver.bidiEventSubs), Object.prototype);
      await driver.bidiUnsubscribe(undefined, undefined, [second.subscription]);
      assert.deepEqual(driver.bidiEventSubs, Object.fromEntries(events.map((event) => [event, ['a']])));
      await driver.bidiUnsubscribe(undefined, undefined, [first.subscription]);
      assert.deepEqual(driver.bidiEventSubs, {});
    });

    it('should clear subscription IDs when the session is deleted', async function () {
      const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
      await driver.deleteSession();
      assert.deepEqual(driver.bidiEventSubs, {});
      await assert.rejects(
        driver.executeBidiCommand('session.unsubscribe', {subscriptions: [subscription]}),
        /Unknown subscription/,
      );
    });

    for (const subscriptions of [[], [''], 'id', [null]]) {
      it(`should reject malformed subscription IDs: ${JSON.stringify(subscriptions)}`, async function () {
        await assert.rejects(driver.executeBidiCommand('session.unsubscribe', {subscriptions}), /non-empty array/);
      });
    }

    it('should not throw when the event was never subscribed', async function () {
      await driver.bidiUnsubscribe(['log.entryAdded'], ['']);
      assert.deepStrictEqual(driver.bidiEventSubs, {});
    });

    it('should still unsubscribe a matching event when the list also has an unknown one', async function () {
      await driver.bidiSubscribe(['log.entryAdded'], ['']);
      await driver.bidiUnsubscribe(['log.entryAdded', 'browsingContext.domContentLoaded'], ['']);
      assert.deepStrictEqual(driver.bidiEventSubs, {});
    });
  });

  describe('bidiSubscribe', function () {
    it('should keep previously subscribed contexts when the same event is subscribed again', async function () {
      await driver.bidiSubscribe(['log.entryAdded'], ['ctx-a']);
      await driver.bidiSubscribe(['log.entryAdded'], ['ctx-b']);
      assert.deepStrictEqual(driver.bidiEventSubs, {
        'log.entryAdded': ['ctx-a', 'ctx-b'],
      });
    });

    it('should not duplicate a context that is already subscribed', async function () {
      await driver.bidiSubscribe(['log.entryAdded'], ['ctx-a']);
      await driver.bidiSubscribe(['log.entryAdded'], ['ctx-a', 'ctx-b']);
      assert.deepStrictEqual(driver.bidiEventSubs, {
        'log.entryAdded': ['ctx-a', 'ctx-b'],
      });
    });

    it('should not mix contexts across different events', async function () {
      await driver.bidiSubscribe(['log.entryAdded'], ['ctx-a']);
      await driver.bidiSubscribe(['browsingContext.load'], ['ctx-b']);
      assert.deepStrictEqual(driver.bidiEventSubs, {
        'log.entryAdded': ['ctx-a'],
        'browsingContext.load': ['ctx-b'],
      });
    });
  });
});
