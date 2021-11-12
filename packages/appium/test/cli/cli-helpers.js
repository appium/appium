// @ts-check

import _ from 'lodash';
import {exec} from 'teen_process';
import {PROJECT_ROOT} from '../helpers';
import path from 'path';

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
 * @param {string} appiumHome - Path to `APPIUM_HOME`
 * @param {string[]} args - Args, including commands
 * @returns {Promise<TeenProcessExecResult>}
 */
async function run (appiumHome, args) {
  try {
    /**
     * @type {TeenProcessExecResult}
     */
    return await exec(process.execPath, [EXECUTABLE, ...args], {
      cwd: PROJECT_ROOT,
      env: {
        APPIUM_HOME: appiumHome,
        PATH: process.env.PATH,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    throw err;
  }
}

export const runAppium = _.curry(
  /**
   * Runs the `appium` executable with the given args
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<string>} Contents of `STDOUT`
   */
  async (appiumHome, args) => {
    const {stdout} = await run(appiumHome, args);
    return stdout;
  },
);

export const runAppiumRaw = _.curry(
  /**
   * Runs the `appium` executable with the given args
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<TeenProcessExecResult>} Raw result of `exec`
   */
  async (appiumHome, args) => await run(appiumHome, args),
);

export const runAppiumJson = _.curry(
  /**
   * Runs the `appium` executable with the given args
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @param {string[]} args - Args, including commands
   * @returns {Promise<TeenProcessExecResult>} Raw result of `exec`
   */
  async (appiumHome, args) => {
    if (!args.includes('--json')) {
      args.push('--json');
    }
    return JSON.parse(await runAppium(appiumHome, args));
  },
);

export const installExtension = _.curry(
  /**
   * Given a path to an extension, install it.
   * @param {string} appiumHome
   * @param {import('../../lib/ext-config-io').ExtensionType} type
   * @param {string} pathToExtension
   * @returns {Promise<object>}
   */
  async (appiumHome, type, pathToExtension) => await runAppiumJson(appiumHome, [
    type,
    'install',
    '--source',
    'local',
    pathToExtension,
  ]),
);

/**
 * @typedef {Object} RunAppiumOptions
 * @property {boolean} [raw] - Whether to return the raw output from `teen_process`
 */

/**
 * @typedef {Object} TeenProcessExecResult
 * @property {string} stdout - Stdout
 * @property {string} stderr - Stderr
 * @property {number?} code - Exit code
 */
