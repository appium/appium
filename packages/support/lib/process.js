import { exec } from 'teen_process';


/*
 * Exit Status for pgrep and pkill (`man pkill`)
 *  0. One or more processes matched the criteria.
 *  1. No processes matched.
 *  2. Syntax error in the command line.
 *  3. Fatal error: out of memory etc.
 */

async function getProcessIds (appName) {
  let pids;
  try {
    let {stdout} = await exec('pgrep', ['-x', appName]);
    pids = stdout.trim().split('\n').map((pid) => parseInt(pid, 10));
  } catch (err) {
    if (parseInt(err.code, 10) !== 1) {
      throw new Error(`Error getting process ids for app '${appName}': ${err.message}`);
    }
    pids = [];
  }
  return pids;
}

async function killProcess (appName, force = false) {
  let pids = await getProcessIds(appName);
  if (pids.length === 0) {
    // the process is not running
    return;
  }

  try {
    let args = force ? ['-9'] : [];
    args.push('-x', appName);
    await exec('pkill', args);
  } catch (err) {
    if (parseInt(err.code, 10) !== 1) {
      throw new Error(`Error killing app '${appName}' with pkill: ${err.message}`);
    }
  }
}

export { getProcessIds, killProcess };
