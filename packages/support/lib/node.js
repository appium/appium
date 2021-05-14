import { isWindows } from './system';
import log from './logger';
import { exec } from 'teen_process';
import path from 'path';

/**
 * Internal utility to link global package to local context
 *
 * @returns {string} - name of the package to link
 * @throws {Error} If the command fails
 */
async function linkGlobalPackage (packageName) {
  try {
    log.debug(`Linking package '${packageName}'`);
    const cmd = isWindows() ? 'npm.cmd' : 'npm';
    await exec(cmd, ['link', packageName], {timeout: 20000});
  } catch (err) {
    const msg = `Unable to load package '${packageName}', linking failed: ${err.message}`;
    log.debug(msg);
    if (err.stderr) {
      // log the stderr if there, but do not add to thrown error as it is
      // _very_ verbose
      log.debug(err.stderr);
    }
    throw new Error(msg);
  }
}

/**
 * Utility function to extend node functionality, allowing us to require
 * modules that are installed globally. If the package cannot be required,
 * this will attempt to link the package and then re-require it
 *
 * @param {string} packageName - the name of the package to be required
 * @returns {object} - the package object
 * @throws {Error} If the package is not found locally or globally
 */
async function requirePackage (packageName) {
  // first, get it in the normal way (see https://nodejs.org/api/modules.html#modules_all_together)
  try {
    log.debug(`Loading local package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    log.debug(`Failed to load local package '${packageName}': ${err.message}`);
  }

  // second, get it from where it ought to be in the global node_modules
  try {
    const globalPackageName = path.resolve(process.env.npm_config_prefix, 'lib', 'node_modules', packageName);
    log.debug(`Loading global package '${globalPackageName}'`);
    return require(globalPackageName);
  } catch (err) {
    log.debug(`Failed to load global package '${packageName}': ${err.message}`);
  }

  // third, link the file and get locally
  try {
    await linkGlobalPackage(packageName);
    log.debug(`Retrying load of linked package '${packageName}'`);
    return require(packageName);
  } catch (err) {
    log.errorAndThrow(`Unable to load package '${packageName}': ${err.message}`);
  }
}

export { requirePackage };
