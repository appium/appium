import log from '../lib/logger';
import {fs, system} from '@appium/support';
import {exec} from 'teen_process';
import {isFunction} from 'lodash';

/**
 * @param {string} message
 * @returns {CheckResult}
 */
export function ok(message) {
  return {ok: true, optional: false, message};
}

/**
 * @param {string} message
 * @returns {CheckResult}
 */
export function nok(message) {
  return {ok: false, optional: false, message};
}

/**
 * @param {string} message
 * @returns {CheckResult}
 */
export function okOptional(message) {
  return {ok: true, optional: true, message};
}

/**
 * @param {string} message
 * @returns {CheckResult}
 */
export function nokOptional(message) {
  return {ok: false, optional: true, message};
}

/**
 * @param {any} question https://www.npmjs.com/package/inquirer#question
 * @returns {Promise<{confirmation: string}>}
 */
export async function prompt(question) {
  const {default: inquirer} = await import('inquirer');
  return await inquirer.prompt(question);
}

let actualLog;

export function configureBinaryLog(opts) {
  actualLog = log.unwrap().log;
  log.unwrap().log = function (level, prefix, msg) {
    let l = this.levels[level];
    if (l < this.levels[this.level]) return; // eslint-disable-line curly
    actualLog(level, prefix, msg);

    if (isFunction(opts.onLogMessage)) {
      opts.onLogMessage(level, prefix, msg);
    }
  };
  log.level = opts.debug ? 'debug' : 'info';
}

/**
 * If {@link configureBinaryLog} was called, this will restore the original `log` function.
 */
export function resetLog() {
  if (actualLog) {
    log.unwrap().log = actualLog;
  }
}

/**
 * Return an executable path of cmd
 *
 * @param {string} cmd Standard output by command
 * @return {Promise<string?>} The full path of cmd. `null` if the cmd is not found.
 */
export async function resolveExecutablePath(cmd) {
  let executablePath;
  try {
    executablePath = await fs.which(cmd);
    if (executablePath && (await fs.exists(executablePath))) {
      return executablePath;
    }
  } catch (err) {
    if (/not found/gi.test(err.message)) {
      log.debug(err);
    } else {
      log.warn(err);
    }
  }
  log.debug(`No executable path of '${cmd}'.`);
  if (executablePath) {
    log.debug(`Does '${executablePath}' exist?`);
  }
  return null;
}

/**
 * @typedef NpmPackageInfo
 * @property {string} version - version
 * @property {string} path - A path to npm root
 */

/**
 * Returns the path and version of given package name
 * @param {string} packageName A package name to get path and version data
 * @return {Promise<NpmPackageInfo?>}
 */
export async function getNpmPackageInfo(packageName) {
  const npmPath = await resolveExecutablePath(`npm${system.isWindows() ? `.cmd` : ''}`);
  if (!npmPath) {
    return null;
  }

  let pJson = {};
  try {
    const {stdout} = await exec(npmPath, ['list', '-g', '-l', '-j', packageName]);
    pJson = JSON.parse(stdout);
  } catch (err) {
    log.debug(err);
    return null;
  }

  if (pJson.dependencies && pJson.dependencies[packageName]) {
    return {version: pJson.dependencies[packageName].version, path: pJson.path};
  }

  return null;
}

/**
 * @typedef CheckResult
 * @property {boolean} ok
 * @property {boolean} optional
 * @property {string} message
 */
