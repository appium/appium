// @ts-check

/**
 * This module provides helper functions for E2E tests to spawn an `appium` subprocess.
 */

import _ from 'lodash';
import path from 'path';
import { exec } from 'teen_process';
import { PACKAGE_ROOT, resolveFixture } from '../helpers';
import { fs } from '@appium/support';

/**
 * Path to the (compiled) main script of the `appium` executable.
 *
 * This means **you must build `appium` before running tests calling this code.**
 */
export const EXECUTABLE = path.join(PACKAGE_ROOT, 'build', 'lib', 'main.js');

/**
 * Runs the `appium` executable with the given args.
 *
 * If the process exits with a nonzero code, the error will be a {@link AppiumRunError}.
 * @template {import('../../types/cli').CliExtensionSubcommand} ExtSubcommand
 * @param {string} appiumHome - Path to `APPIUM_HOME`
 * @param {CliExtArgs<ExtSubcommand> | CliArgs} args - Args, including commands
 * @param {import('teen_process').ExecOptions} [opts] - Options for `teen_process`
 * @returns {Promise<import('teen_process').ExecResult<string>>}
 */
async function run (appiumHome, args, opts = {}) {
  const cwd = PACKAGE_ROOT;
  const env = {
    APPIUM_HOME: appiumHome,
    PATH: process.env.PATH,
  };
  try {
    args = [...process.execArgv, '--', EXECUTABLE, ...args];
    return await exec(process.execPath, args, {
      cwd,
      env,
      ...opts
    });
  } catch (err) {
    const {stdout, stderr} = /** @type {TeenProcessExecError} */ (err);
    /**
     * @type {AppiumRunError}
     */
    const runErr = Object.assign(err, {
      originalMessage: err.message,
      message: `${stdout.trim()}\n\n${stderr.trim()}`,
      command: `${process.execPath} ${EXECUTABLE} ${args.join(' ')}`,
      env,
      cwd,
    });
    throw runErr;
  }
}

/**
 * See {@link runAppium}.
 * @type {AppiumRunner<string>}
 */
async function _runAppium (appiumHome, args) {
  const {stdout} = await run(appiumHome, args);
  return stdout;
}

/**
 * Runs the `appium` executable with the given args and returns contents of `STDOUT`.
 *
 * _Do not use this when testing error output_, as it will likely be in `STDERR` and thusly ignored.
 * Use {@link runAppiumRaw} instead.
 */
export const runAppium = _.curry(_runAppium);

/**
 * See {@link runAppiumRaw}.
 * @type {AppiumOptsRunner<import('teen_process').ExecResult>}
 */
async function _runAppiumRaw (appiumHome, args, opts) {
  try {
    return await run(appiumHome, args, opts);
  } catch (err) {
    return err;
  }
}

/**
 * Runs the `appium` executable with the given args and returns the entire
 * `ExecResult` object.
 *
 * **The third parameter is required**.  Pass empty object if you don't need it.
 **/
export const runAppiumRaw = _.curry(_runAppiumRaw);

/**
 * See {@link runAppiumJson}.
 * @type {AppiumRunner<unknown>}
 */
async function _runAppiumJson (appiumHome, args) {
  if (!args.includes('--json')) {
    args.push('--json');
  }
  const stdout = await runAppium(appiumHome, args);
  try {
    return JSON.parse(stdout);
  } catch (err) {
    err.message = `Error parsing JSON. Contents of STDOUT: ${stdout}`;
    throw err;
  }
}

/**
 * Runs the `appium` executable with the given args in JSON mode.
 * Will reject with the contents of `STDOUT` (which were to be pasred) if parsing into JSON fails.
 *
 * The caller must wrap the call (in parens) with a docstring containing a return type.
 * i.e., add `@type {MyType}` tag.
 */
export const runAppiumJson = /**
 * @template {import('../../types/cli').CliExtensionSubcommand} ExtSubcommand
 * @type {import('lodash').CurriedFunction2<string, CliExtArgs<ExtSubcommand>|CliArgs, Promise<unknown>>}
 */ (_.curry(_runAppiumJson));

/**
 * Given a path to a local extension, install it into `appiumHome` via CLI.
 * @template {ExtensionType} ExtType
 * @param {string} appiumHome
 * @param {ExtType} type
 * @param {string} pathToExtension
 */
export async function installLocalExtension (appiumHome, type, pathToExtension) {
  return /** @type {import('../../lib/extension/manifest').ExtRecord<ExtType>} */ (
    /** @type {unknown} */ (
      await runAppiumJson(appiumHome, [
        type,
        'install',
        '--source',
        'local',
        pathToExtension,
      ])
    )
  );
}

/**
 * Given a name/path of a fixture, read it as `stderr` when `appium` fails while parsing arguments.
 *
 * Usage text is stripped and trailing newlines are normalized.
 * @param {string} name - Name of a fixture
 * @returns {Promise<string>} - Contents of file, normalized
 */
export async function readAppiumArgErrorFixture (name) {
  const filepath = resolveFixture(name);
  const body = await fs.readFile(filepath, 'utf8');
  return formatAppiumArgErrorOutput(body);
}

/**
 * Given `stderr` from `appium`, normalize output for easier comparison.
 * @param {string} stderr
 * @returns {string}
 */
export function formatAppiumArgErrorOutput (stderr) {
  return stderr.replace(/^[\s\S]+\n\n([\s\S]+)/, '$1').trim() + '\n';
}

/**
 * Options for {@link runAppium}.
 * @private
 * @typedef RunAppiumOptions
 * @property {boolean} [raw] - Whether to return the raw output from `teen_process`
 */

/**
 * Error thrown by all of the functions in this file which execute `appium`.
 * @typedef {Error & AppiumRunErrorProps & import('@appium/support/lib/npm').TeenProcessExecErrorProps} AppiumRunError
 */

/**
 * @typedef {import('../../lib/extension/manifest').ExtensionType} ExtensionType
 * @typedef {import('@appium/support/lib/npm').TeenProcessExecError} TeenProcessExecError
 * @typedef {import('../../lib/cli/extension-command').ExtensionListData} ExtensionListData
 */

/**
 * Wraps the error returned by {@link exec}.
 * @typedef AppiumRunErrorProps
 * @property {string} originalMessage - Original error message
 * @property {string} command - Command that was run
 * @property {string} env - Environment variables
 * @property {string} cwd - Current working directory
 */

/**
 * @template T
 * @typedef {import('../../lib/extension/manifest').ExtRecord<T>} ExtRecord
 */

/**
 * @template ExtSubCommand
 * @typedef {[import('../../types/cli').CliSubcommand, ExtSubCommand, ...string[]]} CliExtArgs
 */

/**
 * @typedef {string[]} CliArgs
 */

/**
 * @template [Result=unknown]
 * @template {import('../../types/cli').CliSubcommand} [ExtSubcommand=never]
 * @callback AppiumRunner
 * @param {string} appiumHome
 * @param {CliExtArgs<ExtSubcommand>|CliArgs} args
 * @returns {Promise<Result>}
 */


/**
 * @template [Result=unknown]
 * @template {import('../../types/cli').CliExtensionSubcommand} [ExtSubcommand=never]
 * @callback AppiumOptsRunner
 * @param {string} appiumHome
 * @param {CliExtArgs<ExtSubcommand>|CliArgs} args
 * @param {import('teen_process').ExecOptions} opts
 * @returns {Promise<Result>}
 */
