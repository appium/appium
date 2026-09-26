import fs from 'node:fs';
import {promises as fsp} from 'node:fs';

import {waitForCondition} from 'asyncbox';

const POLL_INTERVAL_MS = 50;
const TERMINATION_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

// Different installed drivers/plugins may each carry their own separate copy of this module, so a
// module-level Set/flag would not actually be process-wide. Keyed off the shared `process` object
// via a global symbol instead, so all copies install exactly one set of listeners between them.
const CLEANUP_STATE_KEY = Symbol.for('@appium/support:lockfile-cleanup-state');

interface CleanupState {
  heldLockFiles: Set<string>;
}

function getCleanupState(): CleanupState {
  const proc = process as unknown as Record<symbol, CleanupState | undefined>;
  let state = proc[CLEANUP_STATE_KEY];
  if (state) {
    return state;
  }

  state = {heldLockFiles: new Set<string>()};
  proc[CLEANUP_STATE_KEY] = state;

  const releaseAllHeldLocks = (): void => {
    for (const lockFile of state!.heldLockFiles) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // best effort
      }
    }
    state!.heldLockFiles.clear();
  };

  const onTerminationSignal = (signal: NodeJS.Signals): void => {
    releaseAllHeldLocks();
    // Remove our own listeners and re-raise, so default/other handlers (e.g. a graceful
    // server shutdown) still run as if we were never here.
    for (const sig of TERMINATION_SIGNALS) {
      process.removeListener(sig, onTerminationSignal);
    }
    process.kill(process.pid, signal);
  };

  process.once('exit', releaseAllHeldLocks);
  for (const signal of TERMINATION_SIGNALS) {
    process.on(signal, onTerminationSignal);
  }

  return state;
}

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
    getCleanupState().heldLockFiles.add(this.lockFile);
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
    getCleanupState().heldLockFiles.delete(this.lockFile);
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
    getCleanupState().heldLockFiles.delete(this.lockFile);
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
