import {exec} from 'teen_process';
import type {ExecError} from 'teen_process';

/*
 * Exit Status for pgrep and pkill (`man pkill`)
 *  0. One or more processes matched the criteria.
 *  1. No processes matched.
 *  2. Syntax error in the command line.
 *  3. Fatal error: out of memory etc.
 */

/**
 * Get PIDs of processes whose executable name matches the given name (exact match via pgrep -x).
 *
 * @param appName - Executable name to match (e.g. 'tail', 'node').
 * @returns Promise resolving to an array of process IDs. Empty if no processes matched.
 * @throws {Error} If pgrep fails for any reason other than "no processes matched" (exit 1).
 * @deprecated Use a process-management API or package that fits your platform instead.
 */
export async function getProcessIds(appName: string): Promise<number[]> {
  let pids: number[];
  try {
    const {stdout} = await exec('pgrep', ['-x', appName]);
    pids = stdout
      .trim()
      .split('\n')
      .map((pid) => parseInt(pid, 10));
  } catch (err) {
    const code = (err as ExecError).code;
    if (code !== 1) {
      throw new Error(`Error getting process ids for app '${appName}': ${(err as Error).message}`);
    }
    pids = [];
  }
  return pids;
}

/**
 * Kill all processes whose executable name matches the given name (via pkill -x).
 *
 * @param appName - Executable name to match (e.g. 'tail', 'node').
 * @param force - If true, use SIGKILL (-9); otherwise use default pkill signal.
 * @returns Promise that resolves when done, or when no matching processes were running.
 * @throws {Error} If pkill fails for any reason other than "no processes matched" (exit 1).
 * @deprecated Use a process-management API or package that fits your platform instead.
 */
export async function killProcess(appName: string, force = false): Promise<void> {
  const pids = await getProcessIds(appName);
  if (pids.length === 0) {
    return;
  }

  try {
    const args = force ? ['-9', '-x', appName] : ['-x', appName];
    await exec('pkill', args);
  } catch (err) {
    const code = (err as ExecError).code;
    if (code !== 1) {
      throw new Error(`Error killing app '${appName}' with pkill: ${(err as Error).message}`);
    }
  }
}
