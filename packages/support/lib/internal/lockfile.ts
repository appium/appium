import fs from 'node:fs';
import {promises as fsp} from 'node:fs';

import {waitForCondition} from 'asyncbox';

const POLL_INTERVAL_MS = 50;

/** Cross-platform, dependency-free exclusive file lock, keyed by a single lock file path. */
export class LockFile {
  constructor(private readonly lockFile: string) {}

  /** Atomically creates the lock file (recording our pid in it, for diagnostics); throws an EEXIST error if it already exists. */
  acquireSync(): void {
    try {
      fs.writeFileSync(this.lockFile, String(process.pid), {flag: 'wx'});
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      throw err.code === 'EEXIST' ? this.eexistError() : err;
    }
  }

  /** Polls for up to `waitMs` to atomically create the lock file; throws EEXIST on timeout. */
  async acquire(waitMs: number): Promise<void> {
    await waitForCondition(
      () => {
        try {
          this.acquireSync();
          return true;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw e;
          }
          return false;
        }
      },
      {waitMs, intervalMs: POLL_INTERVAL_MS, error: this.eexistError()},
    );
  }

  /** Removes the lock file, ignoring the case where it does not exist. */
  releaseSync(): void {
    try {
      fs.unlinkSync(this.lockFile);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }
  }

  /** Removes the lock file, ignoring the case where it does not exist. */
  async release(): Promise<void> {
    try {
      await fsp.unlink(this.lockFile);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }
  }

  /** Returns whether the lock file currently exists. */
  async isLocked(): Promise<boolean> {
    try {
      await fsp.access(this.lockFile);
      return true;
    } catch {
      return false;
    }
  }

  private eexistError(): NodeJS.ErrnoException {
    const err = new Error(`EEXIST: lock file already exists, open '${this.lockFile}'`) as NodeJS.ErrnoException;
    err.code = 'EEXIST';
    return err;
  }
}
