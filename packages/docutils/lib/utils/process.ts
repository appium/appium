import type {SpawnOptions} from 'node:child_process';
import {spawn} from 'node:child_process';

import type {ExecError, TeenProcessExecOptions} from 'teen_process';
import {exec} from 'teen_process';

export type SpawnBackgroundProcessOpts = Omit<SpawnOptions, 'stdio'>;

/**
 * Spawns a long-running "background" child process.  This is expected to only return control to the
 * parent process in the case of a nonzero exit code from the child process.
 * @param command Command to run
 * @param args Args to pass to command
 * @param opts Spawn options (`stdio` is always set to `'inherit'`)
 * @privateRemarks `teen_process` is good for running a one-shot command, but not so great for
 * background tasks; we use node's `child_process` directly here to pass `stdio` through, since
 * `teen_process` basically does not respect `{stdio: 'inherit'}`.
 */
export async function spawnBackgroundProcess(command: string, args: string[], opts: SpawnBackgroundProcessOpts = {}) {
  return new Promise<void>((resolve, reject) => {
    spawn(command, args, {...opts, stdio: 'inherit'})
      .on('error', reject)
      .on('close', (code, signal) => {
        if (code === 0) {
          return resolve();
        }
        const reason = code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`;
        reject(new Error(`${command} exited with ${reason}`));
      });
  });
}

/**
 * Wraps {@linkcode exec} with error handling that appends stderr to the thrown error message.
 */
export async function execWithErrorHandling(cmd: string, args?: string[], opts?: TeenProcessExecOptions) {
  try {
    return await exec(cmd, args, opts);
  } catch (err) {
    const execErr = err as ExecError;
    execErr.message = execErr.stderr ? `${execErr.message}\nCommand error:\n${execErr.stderr}` : execErr.message;
    throw execErr;
  }
}
