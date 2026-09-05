import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';
import {createSandbox} from 'sinon';

import {BaseDriver} from '../../../../lib/index.js';

const FIRST_LOGS = ['first', 'logs'];
const SECOND_LOGS = ['second', 'logs'];
const SUPPORTED_LOG_TYPES = {
  one: {
    description: 'First logs',
    getter: () => structuredClone(FIRST_LOGS),
  },
  two: {
    description: 'Seconds logs',
    getter: () => structuredClone(SECOND_LOGS),
  },
};

describe('log commands -', function () {
  let sandbox: sinon.SinonSandbox;
  let driver: BaseDriver<any, any, any, any, any>;

  beforeEach(function () {
    sandbox = createSandbox();
    driver = new BaseDriver({} as InitialOpts);
    driver.supportedLogTypes = {};
    (driver as any)._log = {
      debug: () => {},
    } as any;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getLogTypes', function () {
    it('should return empty array when no supported log types', async function () {
      assert.deepStrictEqual(await driver.getLogTypes(), []);
    });
    it('should return keys to log type object', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      assert.deepStrictEqual(await driver.getLogTypes(), ['one', 'two']);
    });
  });

  describe('getLog', function () {
    let one: sinon.SinonSpy;
    let two: sinon.SinonSpy;
    beforeEach(function () {
      one = sandbox.spy(SUPPORTED_LOG_TYPES.one, 'getter');
      two = sandbox.spy(SUPPORTED_LOG_TYPES.two, 'getter');
    });
    it('should throw error if log type not supported', async function () {
      await assert.rejects(driver.getLog('one'));
      assert.strictEqual(one.called, false);
      assert.strictEqual(two.called, false);
    });
    it('should throw an error with available log types if log type not supported', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      let err: Error | undefined;
      try {
        await driver.getLog('three');
      } catch (_err) {
        err = _err as Error;
      }
      assert.ok(err);
      assert.strictEqual(
        err!.message,
        `Unsupported log type 'three'. Supported types: {"one":"First logs","two":"Seconds logs"}`,
      );
      assert.strictEqual(one.called, false);
      assert.strictEqual(two.called, false);
    });
    it('should call getter on appropriate log when found', async function () {
      driver.supportedLogTypes = SUPPORTED_LOG_TYPES as any;
      const logs = await driver.getLog('one');
      assert.deepStrictEqual(logs, FIRST_LOGS);
      assert.strictEqual(one.called, true);
      assert.strictEqual(two.called, false);
    });
  });
});
