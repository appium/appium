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
