/**
 * Helper functions for E2E tests to spawn an `appium` subprocess.
 */
import {console as supportConsole, fs} from '@appium/support';
import '@colors/colors';
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

function curry2<A, B, R>(
  fn: (a: A, b: B) => R
): {
  (a: A): (b: B) => R;
  (a: A, b: B): R;
} {
  function curried(a: A, b?: B): R | ((b2: B) => R) {
    if (arguments.length >= 2) {
      return fn(a, b as B);
    }
    return (b2: B) => fn(a, b2);
  }
  return curried as {
    (a: A): (b: B) => R;
    (a: A, b: B): R;
  };
}

function curry3<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R
): {
  (a: A): (b: B) => (c: C) => R;
  (a: A, b: B): (c: C) => R;
  (a: A, b: B, c: C): R;
} {
  function curried(a: A, b?: B, c?: C): unknown {
    if (arguments.length >= 3) {
      return fn(a, b as B, c as C);
    }
    if (arguments.length === 2) {
      return (c2: C) => fn(a, b as B, c2);
    }
    return (b2: B) => (c2: C) => fn(a, b2, c2);
  }
  return curried as {
    (a: A): (b: B) => (c: C) => R;
    (a: A, b: B): (c: C) => R;
    (a: A, b: B, c: C): R;
  };
}

async function run(
  appiumHome: string,
  args: CliExtArgs | CliArgs,
  opts: {env?: Record<string, string>; FORCE_COLOR?: string} = {}
): Promise<{stdout: string; stderr: string}> {
  const cwd = APPIUM_ROOT;
  const env: Record<string, string | undefined> = {...opts.env};
  env.APPIUM_HOME ??= appiumHome;
  env.PATH ??= process.env.PATH;
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
    const execErr = err as ExecError;
    const baseErr = err instanceof Error ? err : new Error(String(err));
    const runErr = Object.assign(baseErr, {
      originalMessage: baseErr.message,
      message: `${stdout.trim()}\n\n${stderr.trim()}`,
      command: `${process.execPath} ${EXECUTABLE} ${args.join(' ')}`,
      env,
      cwd,
      stdout,
      stderr,
      code: execErr.code ?? 1,
    }) as unknown as AppiumRunError;
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

export const runAppium = curry2(_runAppium);

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

export const runAppiumRaw = curry3(_runAppiumRaw);

type RunAppiumJsonCurried = {
  (appiumHome: string): (args: CliExtArgs | CliArgs) => Promise<unknown>;
  (appiumHome: string, args: CliExtArgs | CliArgs): Promise<unknown>;
};

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
export const runAppiumJson: RunAppiumJsonCurried = curry2(_runAppiumJson) as RunAppiumJsonCurried;

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
