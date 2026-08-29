import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';

import {BaseDriver} from '../../../lib/index.js';

describe('BaseDriver', function () {
  describe('constructor', function () {
    it('should initialize "opts"', function () {
      const driver = new BaseDriver({} as InitialOpts);
      assert.ok(driver.opts);
    });
  });
});
