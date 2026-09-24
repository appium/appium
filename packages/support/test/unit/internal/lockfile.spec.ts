import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as nodeFs from 'node:fs';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {fs, tempDir} from '../../../lib/index.js';
import {LockFile} from '../../../lib/internal/lockfile.js';

describe('internal/lockfile', function () {
  describe('LockFile', function () {
    let tmpRoot: string;
    let lockFile: string;
    let deadPid: number;

    beforeEach(async function () {
      tmpRoot = await tempDir.openDir();
      lockFile = path.resolve(tmpRoot, 'test.lock');
      // A pid that spawnSync has already reaped is guaranteed to be dead.
      deadPid = spawnSync(process.execPath, ['-e', 'process.exit(0)']).pid as number;
    });

    afterEach(async function () {
      await fs.rimraf(tmpRoot);
    });

    it('should reclaim a lock file abandoned by a dead process', function () {
      nodeFs.writeFileSync(lockFile, String(deadPid), 'utf8');
      new LockFile(lockFile).acquireSync();
      assert.strictEqual(nodeFs.readFileSync(lockFile, 'utf8'), String(process.pid));
    });

    it('should self-heal a reclaim marker abandoned by a dead reclaimer', function () {
      nodeFs.writeFileSync(lockFile, String(deadPid), 'utf8');
      nodeFs.writeFileSync(`${lockFile}.reclaim`, String(deadPid), 'utf8');
      new LockFile(lockFile).acquireSync();
      assert.strictEqual(nodeFs.readFileSync(lockFile, 'utf8'), String(process.pid));
      assert.strictEqual(nodeFs.existsSync(`${lockFile}.reclaim`), false);
    });

    it('should not touch the lock file while another process is already recovering it', function () {
      // Simulate a concurrent reclaimer by holding the marker ourselves, as a live process would.
      nodeFs.writeFileSync(lockFile, String(deadPid), 'utf8');
      nodeFs.writeFileSync(`${lockFile}.reclaim`, String(process.pid), 'utf8');

      assert.throws(() => new LockFile(lockFile).acquireSync(), /EEXIST/);

      // The abandoned lock must be left exactly as it was -- reclaiming it is the other
      // (still in-progress, from our point of view) reclaimer's job, not ours.
      assert.strictEqual(nodeFs.readFileSync(lockFile, 'utf8'), String(deadPid));
      assert.strictEqual(nodeFs.readFileSync(`${lockFile}.reclaim`, 'utf8'), String(process.pid));
    });
  });
});
