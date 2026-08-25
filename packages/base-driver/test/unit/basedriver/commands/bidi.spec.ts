import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../../lib';

describe('bidi commands -', function () {
  let driver: BaseDriver<any, any, any, any, any, any>;

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
});
