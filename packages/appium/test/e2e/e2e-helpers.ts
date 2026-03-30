/**
 * Helper functions for E2E tests to spawn an `appium` subprocess.
 */
import {console as supportConsole, fs} from '@appium/support';
import '@colors/colors';
import _ from 'lodash';
import path from 'node:path';
import {exec} from 'teen_process';
import type {ExecError} from 'teen_process';
import type {DriverType, PluginType} from '@appium/types';
import type {CliExtensionSubcommand, ExtRecord} from 'appium/types';
import {APPIUM_ROOT, resolveFixture} from '../helpers';

export const EXECUTABLE = path.join(APPIUM_ROOT, 'build', 'lib', 'main.js');

export const log = new supportConsole.CliConsole();

export type CliArgs = string[];

export type CliExtArgs<ExtSubcommand extends CliExtensionSubcommand = CliExtensionSubcommand> = [
  DriverType | PluginType,
  ExtSubcommand,
  ...string[],
];

export interface AppiumRunErrorProps {
  originalMessage: string;
  message: string;
  command: string;
  env: Record<string, string | undefined> | undefined;
  cwd: string;
}

export type AppiumRunError = Error &
  AppiumRunErrorProps &
  ExecError & {stdout: string; stderr: string};

async function run(
  appiumHome: string,
  args: CliExtArgs | CliArgs,
  opts: {env?: Record<string, string>; FORCE_COLOR?: string} = {}
): Promise<{stdout: string; stderr: string}> {
  const cwd = APPIUM_ROOT;
  const env = _.defaults(opts.env ?? {}, {
    APPIUM_HOME: appiumHome,
    PATH: process.env.PATH,
  });
  try {
    const fullArgs = [...process.execArgv, '--', EXECUTABLE, ...args];
    if (process.env._FORCE_LOGS) {
      log.debug('APPIUM_HOME: %s', env.APPIUM_HOME);
      log.debug(`Running: ${process.execPath} ${fullArgs.join(' ')}`);
    }
    const retval = await exec(process.execPath, fullArgs, {...opts, cwd, env});
    const strip = (s: string) =>
      opts.env?.FORCE_COLOR ? s : (s as unknown as {stripColors: string}).stripColors ?? s;
    return {
      stdout: strip(retval.stdout),
      stderr: strip(retval.stderr),
    };
  } catch (err) {
    const {stdout = '', stderr = ''} = err as ExecError & {stdout?: string; stderr?: string};
    const runErr = Object.assign(err, {
      originalMessage: (err as Error).message,
      message: `${(stdout as string).trim()}\n\n${(stderr as string).trim()}`,
      command: `${process.execPath} ${EXECUTABLE} ${args.join(' ')}`,
      env,
      cwd,
    }) as AppiumRunError;
    throw runErr;
  }
}

async function _runAppium(
  appiumHome: string,
  args: CliExtArgs | CliArgs
): Promise<string> {
  const {stdout} = await run(appiumHome, args);
  return stdout;
}

export const runAppium = _.curry(_runAppium);

async function _runAppiumRaw(
  appiumHome: string,
  args: CliExtArgs | CliArgs,
  opts: {env?: Record<string, string>}
): Promise<{stdout: string; stderr: string} | AppiumRunError> {
  try {
    return await run(appiumHome, args, opts);
  } catch (err) {
    return err as AppiumRunError;
  }
}

export const runAppiumRaw = _.curry(_runAppiumRaw);

async function _runAppiumJson(
  appiumHome: string,
  args: CliExtArgs | CliArgs
): Promise<unknown> {
  const a = args.includes('--json') ? args : ([...args, '--json'] as CliExtArgs | CliArgs);
  const stdout = await runAppium(appiumHome, a);
  try {
    return JSON.parse(stdout);
  } catch (err) {
    (err as Error).message = `Error parsing JSON. Contents of STDOUT: ${stdout}`;
    throw err;
  }
}

type RunAppiumJsonCurried = {
  (appiumHome: string): (args: CliExtArgs | CliArgs) => Promise<unknown>;
  (appiumHome: string, args: CliExtArgs | CliArgs): Promise<unknown>;
};
export const runAppiumJson: RunAppiumJsonCurried = _.curry(_runAppiumJson) as RunAppiumJsonCurried;

export async function installLocalExtension<ExtType extends DriverType | PluginType>(
  appiumHome: string,
  type: ExtType,
  pathToExtension: string
): Promise<ExtRecord<ExtType>> {
  return runAppiumJson(appiumHome, [
    type,
    'install',
    '--source',
    'local',
    pathToExtension,
  ]) as Promise<ExtRecord<ExtType>>;
}

export async function readAppiumArgErrorFixture(name: string): Promise<string> {
  const filepath = resolveFixture(name);
  const body = await fs.readFile(filepath, 'utf8');
  return formatAppiumArgErrorOutput(body);
}

export function formatAppiumArgErrorOutput(stderr: string): string {
  return stderr.replace(/^[\s\S]+\n\n([\s\S]+)/, '$1').trim() + '\n';
}
