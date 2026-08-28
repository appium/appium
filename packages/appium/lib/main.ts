#!/usr/bin/env node

import {fileURLToPath} from 'node:url';

import './logsink.js'; // must run first: global npmlog / log sink setup (see logsink module)
import './logger.js'; // load Appium logger immediately after logsink (order matters for log wiring)
import {env} from '@appium/support';
import type {AppiumServer} from '@appium/types';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliCommandSetupSubcommand,
  CliExtensionSubcommand,
} from 'appium/types/index.js';

import {AppiumInitializer} from './bootstrap/appium-initializer.js';
import {AppiumMainRunner} from './bootstrap/appium-main-runner.js';
import type {ExtCommandInitResult, InitResult, ServerInitData} from './bootstrap/init-types.js';

const initializer = new AppiumInitializer();
const mainRunner = new AppiumMainRunner();

/**
 * Initializes Appium, but does not start the server.
 *
 * Use this to get at the configuration schema.
 *
 * If `args` contains a non-empty `subcommand` which is not `server`, this function will return an empty object.
 */
export async function init<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
>(args?: Args<Cmd, SubCmd>): Promise<InitResult<Cmd>> {
  return initializer.init(args);
}

/**
 * Initializes Appium's config. Starts server if appropriate and resolves the
 * server instance if so; otherwise resolves with `undefined`.
 */
export async function main<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
>(args?: Args<Cmd, SubCmd>): Promise<Cmd extends CliCommandServer ? AppiumServer : void> {
  const initResult = await init(args);
  return mainRunner.run(initResult, args);
}

// NOTE: backwards compat for scripts referencing `build/lib/main.js` directly.
// The executable is `../index.js`, so that module will typically not match here.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}

// Re-export helpers from the same package so `import { … } from 'appium'` stays a supported
// programmatic API (this file is the package `types` entry). The monorepo does not import these
// from `'appium'`; consumers use local paths or `@appium/support`. Dropping them is semver-major.
export {readConfigFile} from './bootstrap/config-file.js';
export {finalizeSchema, getSchema, validate} from './schema/schema.js';
export const resolveAppiumHome = env.resolveAppiumHome;

export type {ExtCommandInitResult, InitResult, ServerInitData};
