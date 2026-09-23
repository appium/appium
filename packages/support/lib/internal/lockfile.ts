import fs from 'node:fs';
import {promises as fsp} from 'node:fs';

import {waitForCondition} from 'asyncbox';

const POLL_INTERVAL_MS = 50;

/** Cross-platform, dependency-free exclusive file lock, keyed by a single lock file path. */
export class LockFile {
  private readonly lockFile: string;

  constructor(lockFile: string) {
    this.lockFile = lockFile;
  }

  /**
   * Atomically creates the lock file (recording our pid in it); throws an EEXIST error if it
   * already exists and is not a stale lock left behind by a since-terminated process.
   */
  acquireSync(): void {
    for (;;) {
      try {
        fs.writeFileSync(this.lockFile, String(process.pid), {flag: 'wx'});
        return;
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code !== 'EEXIST') {
          throw err;
        }
        if (!this.reclaimIfAbandoned()) {
          throw this.eexistError();
        }
        // The stale lock was just removed -- loop back and grab it ourselves.
      }
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

  /** Removes the lock file and returns `true` if it was left behind by a now-dead process. */
  private reclaimIfAbandoned(): boolean {
    let pid: number;
    try {
      pid = Number(fs.readFileSync(this.lockFile, 'utf8').trim());
    } catch {
      // Vanished, unreadable, or written by an incompatible version -- leave it to the normal
      // wait/retry (or explicit tryRecovery) path rather than guessing.
      return false;
    }
    if (!Number.isInteger(pid) || pid <= 0 || this.isProcessAlive(pid)) {
      return false;
    }
    this.releaseSync();
    return true;
  }

  /** Returns whether a process with the given pid is currently running. */
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      // ESRCH means no such process; anything else (e.g. EPERM) means it exists but we can't
      // signal it, so assume it's alive rather than risk stealing an active lock.
      return (e as NodeJS.ErrnoException).code !== 'ESRCH';
    }
  }
}
