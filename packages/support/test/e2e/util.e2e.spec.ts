import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {sleep, waitForCondition} from 'asyncbox';
import {exec} from 'teen_process';

import {fs, tempDir} from '../../lib/index.js';
import * as util from '../../lib/util.js';

describe('#util', function () {
  let tmpRoot: string | null = null;
  let tmpFile: string;
  const content = 'YOLO';

  beforeEach(async function () {
    tmpRoot = await tempDir.openDir();
    tmpFile = path.resolve(tmpRoot, 'example.txt');
    await fs.writeFile(tmpFile, content, 'utf8');
  });

  afterEach(async function () {
    if (tmpRoot) {
      await fs.rimraf(tmpRoot);
    }
    tmpRoot = null;
  });

  describe('toInMemoryBase64()', function () {
    it('should convert a file to base64 encoding', async function () {
      const data = await util.toInMemoryBase64(tmpFile);
      const fileContent = await fs.readFile(tmpFile);
      assert.strictEqual(data.toString(), fileContent.toString('base64'));
    });
  });

  describe('getLockFileGuard()', function () {
    let lockFile: string;
    let testFile: string;
    let guardTmpRoot: string;

    async function guardedBehavior(text: string, msBeforeActing: number) {
      await sleep(msBeforeActing);
      await fs.appendFile(testFile, text, 'utf8');
      return text;
    }

    async function testFileContents(): Promise<string> {
      return (await fs.readFile(testFile)).toString('utf8');
    }

    beforeEach(async function () {
      guardTmpRoot = await tempDir.openDir();
      lockFile = path.resolve(guardTmpRoot, 'test.lock');
      testFile = path.resolve(guardTmpRoot, 'test');
      await fs.writeFile(testFile, 'a', 'utf8');
    });

    afterEach(async function () {
      try {
        await Promise.all([lockFile, testFile].map((p) => fs.unlink(p)));
      } catch {
        // ignore
      }
    });

    it('should lock a file during the given behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      assert.strictEqual(await guard.check(), false);
      const guardPromise = guard(async () => await guardedBehavior('b', 500));
      await sleep(200);
      assert.strictEqual(await guard.check(), true);
      await guardPromise;
      assert.strictEqual(await guard.check(), false);
      assert.strictEqual(await testFileContents(), 'ab');
    });

    it('should recover a broken lock file', async function () {
      await fs.writeFile(lockFile, 'dummy', 'utf8');
      const guard = util.getLockFileGuard(lockFile, {
        timeout: 3,
        tryRecovery: true,
      });
      await guard(async () => await guardedBehavior('b', 500));
      assert.strictEqual(await guard.check(), false);
      assert.strictEqual(await testFileContents(), 'ab');
    });

    it('should immediately reclaim a lock left behind by a dead process', {timeout: 5000}, async function () {
      const child = spawn(process.execPath, ['-e', 'process.exit(0)']);
      const deadPid = child.pid;
      await once(child, 'exit');
      await fs.writeFile(lockFile, String(deadPid), 'utf8');
      const guard = util.getLockFileGuard(lockFile, {timeout: 20});
      const start = Date.now();
      await guard(async () => await guardedBehavior('b', 50));
      assert.ok(Date.now() - start < 2000, 'should not wait out the timeout to reclaim a truly abandoned lock');
      assert.strictEqual(await testFileContents(), 'ab');
    });

    it('should block other behavior until the lock is released', async function () {
      // First prove that without a lock, we get races.
      assert.strictEqual(await testFileContents(), 'a');
      const unguardedPromise1 = guardedBehavior('b', 500);
      const unguardedPromise2 = guardedBehavior('c', 100);
      await unguardedPromise1;
      await unguardedPromise2;
      assert.strictEqual(await testFileContents(), 'acb');

      // Now prove that with a lock, we don't get any interlopers.
      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('b', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('c', 100));
      await guardPromise1;
      await guardPromise2;
      assert.strictEqual(await testFileContents(), 'acbbc');
    });

    it('should return the result of the guarded behavior', async function () {
      const guard = util.getLockFileGuard(lockFile);
      const guardPromise1 = guard(async () => await guardedBehavior('hello', 500));
      const guardPromise2 = guard(async () => await guardedBehavior('world', 100));
      const ret1 = await guardPromise1;
      const ret2 = await guardPromise2;
      assert.strictEqual(ret1, 'hello');
      assert.strictEqual(ret2, 'world');
    });

    it('should time out if the lock is not released', {timeout: 5000}, async function () {
      const guard = util.getLockFileGuard(lockFile, {timeout: 0.5});
      const p1 = guard(async () => await guardedBehavior('hello', 1200));
      const p2 = guard(async () => await guardedBehavior('world', 10));
      await assert.rejects(p2, /not acquire lock/);
      assert.strictEqual(await p1, 'hello');
    });

    it('should still release lock if guarded behavior fails', {timeout: 5000}, async function () {
      const guard = util.getLockFileGuard(lockFile);
      const p1 = guard(async () => {
        await sleep(500);
        throw new Error('bad');
      });
      const p2 = guard(async () => await guardedBehavior('world', 100));
      await assert.rejects(p1, /bad/);
      assert.strictEqual(await p2, 'world');
    });

    describe('across separate OS processes', function () {
      const workerScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixture', 'lock-worker.js');

      async function runWorker(text: string, msBeforeActing: number): Promise<void> {
        await exec(process.execPath, [workerScript, lockFile, testFile, text, String(msBeforeActing)]);
      }

      it('should serialize acquisitions issued by separate processes', {timeout: 10000}, async function () {
        const start = Date.now();
        await Promise.all([runWorker('a', 150), runWorker('b', 150), runWorker('c', 150)]);
        const elapsed = Date.now() - start;
        assert.ok(elapsed >= 400, `expected serialized runs to take at least 400ms, took ${elapsed}ms`);
        assert.deepStrictEqual([...(await testFileContents())].sort(), ['a', 'a', 'b', 'c']);
      });

      it(
        'should make a process wait for a lock genuinely held by another live process',
        {timeout: 10000},
        async function () {
          const firstRun = runWorker('first', 800);
          const guard = util.getLockFileGuard(lockFile);
          await waitForCondition(() => guard.check(), {waitMs: 2000, intervalMs: 20});

          const start = Date.now();
          await runWorker('second', 0);
          const elapsed = Date.now() - start;
          assert.ok(elapsed >= 500, `expected the second process to wait for the first, took ${elapsed}ms`);

          await firstRun;
          assert.strictEqual(await testFileContents(), 'afirstsecond');
        },
      );
    });
  });
});
