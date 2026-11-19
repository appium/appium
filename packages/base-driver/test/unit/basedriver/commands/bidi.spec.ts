import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {
  MAX_BIDI_NAME_LENGTH,
  MAX_BIDI_SUBSCRIPTION_ENTRIES,
  MAX_BIDI_SUBSCRIPTIONS,
} from '../../../../lib/basedriver/commands/bidi.js';
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

    describe('limits', function () {
      const names = (count: number, prefix = 'e') => Array.from({length: count}, (_, i) => `${prefix}${i}`);

      it('should reject more subscriptions than allowed and accept new ones after unsubscribing', async function () {
        const ids: string[] = [];
        for (let i = 0; i < MAX_BIDI_SUBSCRIPTIONS; i++) {
          ids.push((await driver.bidiSubscribe(['log.entryAdded'], [`ctx-${i}`])).subscription);
        }
        await assert.rejects(driver.bidiSubscribe(['log.entryAdded']), /more than 100 subscriptions/);
        assert.equal(driver.bidiEventSubs['log.entryAdded'].length, MAX_BIDI_SUBSCRIPTIONS);
        await driver.bidiUnsubscribe(undefined, undefined, [ids[0]]);
        await driver.bidiSubscribe(['log.entryAdded']);
      });

      it('should reject more event and context combinations than allowed in all the subscriptions', async function () {
        await driver.bidiSubscribe(names(MAX_BIDI_SUBSCRIPTION_ENTRIES / 2), ['a', 'b']);
        await assert.rejects(driver.bidiSubscribe(['x'], ['a']), /more than 1000 combinations/);
        assert.equal(Object.keys(driver.bidiEventSubs).length, MAX_BIDI_SUBSCRIPTION_ENTRIES / 2);
      });

      it('should count the combinations of a single request before storing anything', async function () {
        await assert.rejects(
          driver.bidiSubscribe(names(MAX_BIDI_SUBSCRIPTION_ENTRIES), names(2, 'c')),
          /more than 1000 combinations/,
        );
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should not count the repeated events and contexts of a request', async function () {
        await driver.bidiSubscribe(Array(MAX_BIDI_SUBSCRIPTION_ENTRIES).fill('log.entryAdded'), ['a', 'a', 'a']);
        assert.deepStrictEqual(driver.bidiEventSubs, {'log.entryAdded': ['a']});
      });

      it('should accept exactly the maximum number of combinations', async function () {
        await driver.bidiSubscribe(names(MAX_BIDI_SUBSCRIPTION_ENTRIES), ['']);
        assert.equal(Object.keys(driver.bidiEventSubs).length, MAX_BIDI_SUBSCRIPTION_ENTRIES);
      });

      it('should reject too long lists and names', async function () {
        const tooMany = names(MAX_BIDI_SUBSCRIPTION_ENTRIES + 1);
        const tooLong = 'x'.repeat(MAX_BIDI_NAME_LENGTH + 1);
        await assert.rejects(driver.bidiSubscribe(tooMany), /events must not have more than 1000 items/);
        await assert.rejects(driver.bidiSubscribe(['log.entryAdded'], tooMany), /contexts must not have more than/);
        await assert.rejects(driver.bidiSubscribe([tooLong]), /items of events must not be longer than 256/);
        await assert.rejects(
          driver.bidiSubscribe(['log.entryAdded'], [tooLong]),
          /items of contexts must not be longer/,
        );
        await assert.rejects(driver.bidiUnsubscribe(tooMany), /events must not have more than/);
        await assert.rejects(driver.bidiUnsubscribe(['log.entryAdded'], tooMany), /contexts must not have more than/);
        await assert.rejects(driver.bidiUnsubscribe(undefined, undefined, [tooLong]), /items of subscriptions/);
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should check the size of a list before its items', async function () {
        const invalid = [...names(MAX_BIDI_SUBSCRIPTION_ENTRIES), 1];
        await assert.rejects(driver.bidiSubscribe(invalid as any), /events must not have more than/);
        await assert.rejects(
          driver.bidiSubscribe(['log.entryAdded'], invalid as any),
          /contexts must not have more than/,
        );
        await assert.rejects(driver.bidiUnsubscribe(invalid as any), /events must not have more than/);
        await assert.rejects(
          driver.bidiUnsubscribe(undefined, undefined, invalid as any),
          /subscriptions must not have more than/,
        );
      });

      it('should reuse the slots of the subscriptions that were emptied by the legacy unsubscribe', async function () {
        for (let i = 0; i < MAX_BIDI_SUBSCRIPTIONS * 2; i++) {
          await driver.bidiSubscribe(['log.entryAdded']);
          await driver.bidiUnsubscribe(['log.entryAdded']);
        }
        assert.deepStrictEqual(driver.bidiEventSubs, {});
        const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
        assert.deepStrictEqual(driver.bidiEventSubs, {'log.entryAdded': ['']});
        await driver.bidiUnsubscribe(undefined, undefined, [subscription]);
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should keep the ID of an emptied subscription valid until its slot is needed', async function () {
        const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
        await driver.bidiUnsubscribe(['log.entryAdded']);
        await driver.bidiUnsubscribe(undefined, undefined, [subscription]);
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should not free the slots of the subscriptions that still have events', async function () {
        for (let i = 0; i < MAX_BIDI_SUBSCRIPTIONS; i++) {
          await driver.bidiSubscribe(['log.entryAdded', `e${i}`]);
        }
        await driver.bidiUnsubscribe(['log.entryAdded']);
        await assert.rejects(driver.bidiSubscribe(['x']), /more than 100 subscriptions/);
      });

      it('should keep the ID of an emptied subscription if the request that needs its slot is rejected', async function () {
        const ids: string[] = [];
        for (let i = 0; i < MAX_BIDI_SUBSCRIPTIONS - 1; i++) {
          ids.push((await driver.bidiSubscribe([`e${i}`])).subscription);
        }
        const {subscription: emptied} = await driver.bidiSubscribe(['log.entryAdded']);
        await driver.bidiUnsubscribe(['log.entryAdded']);
        await assert.rejects(
          driver.bidiSubscribe(names(MAX_BIDI_SUBSCRIPTION_ENTRIES), ['a']),
          /more than 1000 combinations/,
        );
        // the emptied subscription is still known, so the batch is removed as a whole
        await driver.bidiUnsubscribe(undefined, undefined, [emptied, ...ids]);
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should release only one emptied subscription for a new one', async function () {
        const emptied: string[] = [];
        for (let i = 0; i < MAX_BIDI_SUBSCRIPTIONS; i++) {
          emptied.push((await driver.bidiSubscribe([`e${i}`])).subscription);
          await driver.bidiUnsubscribe([`e${i}`]);
        }
        const {subscription} = await driver.bidiSubscribe(['log.entryAdded']);
        await driver.bidiUnsubscribe(undefined, undefined, [subscription, ...emptied.slice(1)]);
        await assert.rejects(driver.bidiUnsubscribe(undefined, undefined, [emptied[0]]), /Unknown subscription/);
        assert.deepStrictEqual(driver.bidiEventSubs, {});
      });

      it('should count an event without contexts as a combination', async function () {
        const events = names(MAX_BIDI_SUBSCRIPTION_ENTRIES / 2);
        await driver.bidiSubscribe(events, []);
        await driver.bidiSubscribe(
          events.map((e) => `${e}-2`),
          [],
        );
        await assert.rejects(driver.bidiSubscribe(['x'], []), /more than 1000 combinations/);
        assert.equal(Object.keys(driver.bidiEventSubs).length, MAX_BIDI_SUBSCRIPTION_ENTRIES);
      });

      it('should count the combinations of every subscription, even if they repeat', async function () {
        const events = names(MAX_BIDI_SUBSCRIPTION_ENTRIES / 2);
        await driver.bidiSubscribe(events);
        await driver.bidiSubscribe(events);
        await assert.rejects(driver.bidiSubscribe(['x']), /more than 1000 combinations/);
        assert.equal(Object.keys(driver.bidiEventSubs).length, MAX_BIDI_SUBSCRIPTION_ENTRIES / 2);
      });

      it('should accept names of the maximum length', async function () {
        const name = 'x'.repeat(MAX_BIDI_NAME_LENGTH);
        await driver.bidiSubscribe([name], [name]);
        assert.deepStrictEqual(driver.bidiEventSubs, {[name]: [name]});
      });
    });
  });
});
