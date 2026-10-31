import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {Constraints, InitialOpts} from '@appium/types';

import {BaseDriver, errors} from '../../../lib/index.js';

describe('BaseDriver missing command handlers', function () {
  let driver: BaseDriver<Constraints>;

  beforeEach(function () {
    driver = new BaseDriver({} as InitialOpts);
    driver.newCommandTimeoutMs = 0;
  });

  for (const command of ['printPage', 'maximizeWindow']) {
    it(`returns unsupported operation for the missing standard ${command} handler`, async function () {
      await assert.rejects(driver.executeCommand(command), (error: Error) => {
        assert.ok(error instanceof errors.UnsupportedOperationError);
        assert.equal(error.w3cStatus, 500);
        assert.equal(error.error, 'unsupported operation');
        return true;
      });
    });
  }

  for (const command of ['notARealCommand', 'customExtensionCommand']) {
    it(`preserves the legacy fallback for the missing ${command} handler`, async function () {
      await assert.rejects(driver.executeCommand(command), (error: Error) => {
        assert.ok(error instanceof errors.NotYetImplementedError);
        assert.equal(error.w3cStatus, 405);
        assert.equal(error.error, 'unknown method');
        return true;
      });
    });
  }

  it('runs an implemented standard handler normally', async function () {
    Object.assign(driver, {printPage: async () => 'synthetic-document'});
    assert.equal(await driver.executeCommand('printPage'), 'synthetic-document');
  });

  it('preserves an implemented standard handler error by identity', async function () {
    const failure = new errors.NotYetImplementedError('Driver-specific failure');
    Object.assign(driver, {
      async printPage() {
        throw failure;
      },
    });
    await assert.rejects(driver.executeCommand('printPage'), (error) => error === failure);
  });
});
