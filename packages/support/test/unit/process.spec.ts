import assert from 'node:assert/strict';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

import {retryInterval} from 'asyncbox';
import {createSandbox} from 'sinon';
import * as teenProcess from 'teen_process';

import {process, system} from '../../lib';

const SubProcess = teenProcess.SubProcess;

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
      proc = new SubProcess('tail', ['-f', __filename]);
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
    it('should throw an error if pgrep fails', async function () {
      (sandbox.stub(teenProcess, 'exec') as any).get(() => sandbox.stub().throws({message: 'Oops', code: 2}));
      await assert.rejects(process.getProcessIds('tail'), /Oops/);
    });
  });

  describe('killProcess', {skip: system.isWindows()}, function () {
    let proc: InstanceType<typeof SubProcess>;
    beforeEach(async function () {
      proc = new SubProcess('tail', ['-f', __filename]);
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
    it('should throw an error if pgrep fails', async function () {
      (sandbox.stub(teenProcess, 'exec') as any).get(() => sandbox.stub().throws({message: 'Oops', code: 2}));
      await assert.rejects(process.killProcess('tail'), /Oops/);
    });
    it('should throw an error if pkill fails', async function () {
      const innerExecStub = sandbox.stub();
      innerExecStub.returns({stdout: '42\n'});
      innerExecStub.throws({message: 'Oops', code: 2});
      (sandbox.stub(teenProcess, 'exec') as any).get(() => innerExecStub);
      await assert.rejects(process.killProcess('tail'), /Oops/);
    });
  });
});
