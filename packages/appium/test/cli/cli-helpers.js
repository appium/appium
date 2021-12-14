// @ts-check

import _ from 'lodash';
import {exec} from 'teen_process';
import {PROJECT_ROOT} from '../helpers';
import path from 'path';

/**
 * Path to the `appium` executable. Sort of.
 */
export const EXECUTABLE = path.join(
  PROJECT_ROOT,
  'packages',
  'appium',
  'build',
  'lib',
  'main.js',
);

/**
 * Runs the `appium` executable with the given args.
 *
 * If the process exits with a nonzero code, the error will be a
 * @param {string} appiumHome - Path to `APPIUM_HOME`
 * @param {string[]} args - Args, including commands
 * @returns {Promise<TeenProcessExecResult>}
 */
async function run (appiumHome, args) {
  const env = {
    APPIUM_HOME: appiumHome,
    PATH: process.env.PATH,
  };
  try {
    /**
     * @type {TeenProcessExecResult}
     */
    return await exec(process.execPath, [EXECUTABLE, ...args], {
      cwd: PROJECT_ROOT,
      env,
    });
  } catch (err) {
    const {stdout, stderr} = /** @type {TeenProcessExecError} */(err);
    /**
     * @type {AppiumRunError}
     */
    const runErr = Object.assign(
      err,
      {
        originalMessage: err.message,
        message: `${stdout.trim()}\n\n${stderr.trim()}`,
        command: `${process.execPath} ${EXECUTABLE} ${args.join(' ')}`,
        env,
        cwd: PROJECT_ROOT,
      });
    throw runErr;
  }
}

/**
 * Runs the `appium` executable with the given args and returns contents of `STDOUT`.
 *
 * Do not use this when testing error output, as it will likely be in `STDERR`. Use {@link runAppiumRaw} instead.
 */
export const runAppium = _.curry(
  /**
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<string>} Contents of ``STDOUT``
   */
  async (appiumHome, args) => {
    const {stdout} = await run(appiumHome, args);
    return stdout;
  },
);

/**
 * Runs the `appium` executable with the given args and returns the entire
 * {@link TeenProcessExecResult} object.
 */
export const runAppiumRaw = _.curry(
  /**
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<TeenProcessExecResult>} Raw result of `exec`
   */
  async (appiumHome, args) => await run(appiumHome, args),
);

/**
 * Runs the `appium` executable with the given args in JSON mode.
 * Will reject with the contents of `STDOUT` (which were to be pasred) if parsing into JSON fails.
 */
export const runAppiumJson = _.curry(
  /**
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<TeenProcessExecResult>} Raw result of `exec`
   */
  async (appiumHome, args) => {
    if (!args.includes('--json')) {
      args.push('--json');
    }
    const result = await runAppium(appiumHome, args);
    try {
      return JSON.parse(result);
    } catch (err) {
      err.message = `Error parsing JSON. Contents of STDOUT: ${result}`;
      throw err;
    }
  },
);

/**
 * Given a path to a local extension, install it into `APPIUM_HOME` via CLI.
 */
export const installLocalExtension = _.curry(
  /**
   * @param {string} appiumHome
   * @param {import('../../lib/ext-config-io').ExtensionType} type
   * @param {string} pathToExtension
   * @returns {Promise<object>}
   */
  async (appiumHome, type, pathToExtension) =>
    await runAppiumJson(appiumHome, [
      type,
      'install',
      '--source',
      'local',
      pathToExtension,
    ]),
);

/**
 * Options for {@link runAppium}.
 * @private
 * @typedef {Object} RunAppiumOptions
 * @property {boolean} [raw] - Whether to return the raw output from `teen_process`
 */


/**
 * Error thrown by all of the functions in this file which execute `appium`.
 * @typedef {Error & AppiumRunErrorProps & import('../../lib/cli/npm').TeenProcessExecErrorProps} AppiumRunError
 */

/**
 * @typedef {import('../../lib/cli/npm').TeenProcessExecResult} TeenProcessExecResult
 */

/**
 * @typedef {import('../../lib/cli/npm').TeenProcessExecError} TeenProcessExecError
 */

/**
 * Wraps the error returned by {@link exec}.
 * @typedef {Object} AppiumRunErrorProps
 * @property {string} originalMessage - Original error message
 * @property {string} command - Command that was run
 * @property {string} env - Environment variables
 * @property {string} cwd - Current working directory
 */
