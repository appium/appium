import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach, after} from 'node:test';

import {logger} from '@appium/support';
import {createSandbox, type SinonSandbox, type SinonSpy} from 'sinon';

import {clear as logsinkClear, init as logsinkInit} from '../../lib/logsink.js';

const forceLogs = process.env._FORCE_LOGS;
process.env._FORCE_LOGS = '1';
const log = logger.getLogger('Appium');

describe('logging', function () {
  let sandbox: SinonSandbox;
  let stderrSpy: SinonSpy;
  let stdoutSpy: SinonSpy;

  beforeEach(async function () {
    sandbox = createSandbox();
    stderrSpy = sandbox.spy(process.stderr, 'write') as SinonSpy;
    stdoutSpy = sandbox.spy(process.stdout, 'write') as SinonSpy;
    logsinkClear();
  });

  afterEach(function () {
    sandbox.restore();
  });

  after(function () {
    process.env._FORCE_LOGS = forceLogs;
  });

  const errorMsg = 'some error';
  const warnMsg = 'some warning';
  const debugMsg = 'some debug';

  function doLogging() {
    log.error(errorMsg);
    log.warn(warnMsg);
    log.debug(debugMsg);
  }

  it('should send error, info and debug when loglevel is debug', async function () {
    await logsinkInit({loglevel: 'debug'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    assert.strictEqual(stderrSpy.callCount, 1);
    assert.ok(stderrSpy.args[0][0].includes(errorMsg));

    assert.strictEqual(stdoutSpy.callCount, 2);
    assert.ok(stdoutSpy.args[0][0].includes(warnMsg));
    assert.ok(stdoutSpy.args[1][0].includes(debugMsg));
  });

  it('should send error and info when loglevel is info', async function () {
    await logsinkInit({loglevel: 'info'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    assert.strictEqual(stderrSpy.callCount, 1);
    assert.ok(stderrSpy.args[0][0].includes(errorMsg));

    assert.strictEqual(stdoutSpy.callCount, 1);
    assert.ok(stdoutSpy.args[0][0].includes(warnMsg));
  });

  it('should send error when loglevel is error', async function () {
    await logsinkInit({loglevel: 'error'} as Parameters<typeof logsinkInit>[0]);

    doLogging();

    assert.strictEqual(stderrSpy.callCount, 1);
    assert.ok(stderrSpy.args[0][0].includes(errorMsg));

    assert.strictEqual(stdoutSpy.callCount, 0);
  });
});
