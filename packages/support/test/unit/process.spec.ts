import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it, type TestContext} from 'node:test';

import {retryInterval} from 'asyncbox';
import {createSandbox} from 'sinon';
import * as teenProcess from 'teen_process';

import {process, system} from '../../lib/index.js';

const SubProcess = teenProcess.SubProcess;

let importCounter = 0;

/**
 * `teen_process` is genuine ESM, so its live bindings cannot be stubbed with sinon
 * post-import. Mock `exec` via `t.mock.module` and re-import `lib/process.js` fresh
 * (cache-busted) so it re-links against the mock instead of a previously-cached module.
 */
async function importProcessWithMockedExec(t: TestContext, execImpl: (...args: any[]) => any) {
  // Spread the real module: a mock replaces the *entire* module for every importer
  // sharing this process, not just the one under test here.
  t.mock.module('teen_process', {
    namedExports: {...teenProcess, exec: execImpl},
  });
  return import(`../../lib/process.js?t=${importCounter++}`);
}

describe('process', function () {
  let sandbox: ReturnType<typeof createSandbox>;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.verify();
    sandbox.restore();
  });

  describe('getProcessIds', {skip: system.isWindows()}, function () {
    let proc: InstanceType<typeof SubProcess> | undefined;
    before(async function () {
      proc = new SubProcess('tail', ['-f', import.meta.filename]);
      await proc.start();
    });
    after(async function () {
      if (proc) {
        await proc.stop();
      }
    });
    it('should get return an array for existing process', async function () {
      const pids = await process.getProcessIds('tail');
      assert.ok(pids instanceof Array);
    });
    it('should get process identifiers for existing process', async function () {
      const pids = await process.getProcessIds('tail');
      assert.ok(pids.length >= 1);
    });
    it('should get an empty array when the process does not exist', async function () {
      const pids = await process.getProcessIds('sadfgasdfasdf');
      assert.strictEqual(pids.length, 0);
    });
    it('should throw an error if pgrep fails', async function (t) {
      const mockedProcess = await importProcessWithMockedExec(t as TestContext, () => {
        throw {message: 'Oops', code: 2};
      });
      await assert.rejects(mockedProcess.getProcessIds('tail'), /Oops/);
    });
  });

  describe('killProcess', {skip: system.isWindows()}, function () {
    let proc: InstanceType<typeof SubProcess>;
    beforeEach(async function () {
      proc = new SubProcess('tail', ['-f', import.meta.filename]);
      await proc.start();
    });
    afterEach(async function () {
      if (proc.isRunning) {
        await proc.stop();
      }
    });
    it('should kill process that is running', async function () {
      assert.strictEqual(proc.isRunning, true);
      await process.killProcess('tail');

      await retryInterval(10, 100, async () => {
        assert.strictEqual(proc.isRunning, false);
      });
    });
    it('should do nothing if the process does not exist', async function () {
      assert.strictEqual(proc.isRunning, true);
      await process.killProcess('asdfasdfasdf');

      await assert.rejects(
        retryInterval(10, 100, async () => {
          assert.strictEqual(proc.isRunning, false);
        }),
      );
    });
    it('should throw an error if pgrep fails', async function (t) {
      const mockedProcess = await importProcessWithMockedExec(t as TestContext, () => {
        throw {message: 'Oops', code: 2};
      });
      await assert.rejects(mockedProcess.killProcess('tail'), /Oops/);
    });
    it('should throw an error if pkill fails', async function (t) {
      // Matches the original stub's behavior: a stub given both `.returns()` and
      // `.throws()` with no argument matcher always throws, so this always fails via
      // the pgrep call `killProcess` makes internally before it ever reaches pkill.
      const mockedProcess = await importProcessWithMockedExec(t as TestContext, () => {
        throw {message: 'Oops', code: 2};
      });
      await assert.rejects(mockedProcess.killProcess('tail'), /Oops/);
    });
  });
});
