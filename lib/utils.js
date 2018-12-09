import B from 'bluebird';
import path from 'path';
import _inquirer from 'inquirer';
import log from '../lib/logger';
import authorize from 'authorize-ios';
import { EOL } from 'os';
import { fs, system } from 'appium-support';
import { exec } from 'teen_process';

// rename to make more sense
const authorizeIos = authorize;

const pkgRoot = process.env.NO_PRECOMPILE ?
  path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');

const ok = (message) => { return {ok: true, message}; };
const nok = (message) => { return {ok: false, message}; };

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
  const executable = system.isWindows() ? 'where' : 'which';
  let stdout;
  try {
    ({stdout} = await exec(executable, [cmd]));
    if (stdout) {
      const executablePath = system.isWindows() ? stdout.split(EOL)[0] : stdout.trim();
      if (await fs.exists(executablePath)) {
        return executablePath;
      }
    }
  } catch (err) {
    log.warn(err);
  }
  log.debug(`No executable path of '${cmd}'. The output of ${executable} is '${stdout}'`);
  return null;
}

export { pkgRoot, ok, nok, inquirer, configureBinaryLog, authorizeIos, resolveExecutablePath};
