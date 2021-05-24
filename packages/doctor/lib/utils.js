import B from 'bluebird';
import path from 'path';
import _inquirer from 'inquirer';
import log from '../lib/logger';
import authorize from 'authorize-ios';
import { fs, system } from 'appium-support';
import { exec } from 'teen_process';
import { isFunction } from 'lodash';

// rename to make more sense
const authorizeIos = authorize;

const pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

function ok (message) {
  return {ok: true, optional: false, message};
}
function nok (message) {
  return {ok: false, optional: false, message};
}
function okOptional (message) {
  return {ok: true, optional: true, message};
}
function nokOptional (message) {
  return {ok: false, optional: true, message};
}

const inquirer = {
  prompt: B.promisify(function (question, cb) { // eslint-disable-line promise/prefer-await-to-callbacks
    _inquirer.prompt(question, function (resp) { cb(null, resp); }); // eslint-disable-line promise/prefer-await-to-callbacks
  })
};

function configureBinaryLog (opts) {
  let actualLog = log.unwrap().log;
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
 * Return an executable path of cmd
 *
 * @param {string} cmd Standard output by command
 * @return {?string} The full path of cmd. `null` if the cmd is not found.
 */
async function resolveExecutablePath (cmd) {
  let executablePath;
  try {
    executablePath = await fs.which(cmd);
    if (executablePath && await fs.exists(executablePath)) {
      return executablePath;
    }
  } catch (err) {
    if ((/not found/gi).test(err.message)) {
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
 * @typedef {Object} NpmPackageInfo
 * @property {string} version - version
 * @property {string} path - A path to npm root
 */
/**
 * Returns the path and version of given package name
 * @param {string} packageName A package name to get path and version data
 * @return {?NpmPackageInfo}
 */
async function getNpmPackageInfo (packageName) {
  const npmPath = await resolveExecutablePath(`npm${system.isWindows() ? `.cmd` : ''}`);
  if (!npmPath) {
    return nokOptional(`'npm' binary not found in PATH: ${process.env.PATH}`);
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

export { pkgRoot, ok, nok, okOptional, nokOptional, inquirer, configureBinaryLog,
  authorizeIos, resolveExecutablePath, getNpmPackageInfo};
