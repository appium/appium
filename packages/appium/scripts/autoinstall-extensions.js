#!/usr/bin/env node

// @ts-check

/* eslint-disable no-console, promise/prefer-await-to-then */

/**
 * This script is intended to be run as a `postinstall` lifecycle script,
 * and will automatically install extensions if requested by the user.
 *
 * If the current working directory is within a project which has `appium`
 * as a dependency, this script does nothing; extensions must be managed
 * via `npm` or another package manager.
 *
 * If `CI=1` is in the environment, this script will exit with a non-zero
 * code upon failure (which will typically break a build).  Otherwise, it
 * will always exit with code 0, even if errors occur.
 *
 * @module
 * @example
 * `npm install -g appium --drivers=uiautomator2,xcuitest --plugins=images`
 */

const B = require('bluebird');
const path = require('node:path');
const {realpath} = require('node:fs/promises');

B.config({
  cancellation: true,
});

/** @type {typeof import('../lib/cli/extension').runExtensionCommand} */
let runExtensionCommand;
/** @type {typeof import('../lib/constants').DRIVER_TYPE} */
let DRIVER_TYPE;
/** @type {typeof import('../lib/constants').PLUGIN_TYPE} */
let PLUGIN_TYPE;
/** @type {typeof import('../lib/extension').loadExtensions} */
let loadExtensions;

const _ = require('lodash');
const wrap = _.partial(
  require('wrap-ansi'),
  _,
  process.stderr.columns ?? process.stdout.columns ?? 80
);
const ora = require('ora');

/** @type {typeof import('@appium/support').env} */
let env;
/** @type {typeof import('@appium/support').util} */
let util;
/** @type {typeof import('@appium/support').logger} */
let logger;

function log(message) {
  console.error(wrap(`[Appium] ${message}`));
}

/**
 * This is a naive attempt at determining whether or not we are in a dev environment; in other
 * words, is `postinstall` being run from within the `appium` monorepo?
 *
 * When we're in the monorepo, `npm_config_local_prefix` will be set to the root of the monorepo root
 * dir when running this lifecycle script from an `npm install` in the monorepo root.
 *
 * `realpath` is necessary due to macOS omitting `/private` from paths
 */
async function isDevEnvironment() {
  return (
    process.env.npm_config_local_prefix &&
    path.join(process.env.npm_config_local_prefix, 'packages', 'appium') ===
      (await realpath(path.join(__dirname, '..')))
  );
}

/**
 * Setup / check environment if we should do anything here
 * @returns {Promise<boolean>} `true` if Appium is built and ready to go
 */
async function init() {
  if (await isDevEnvironment()) {
    log('Dev environment likely; skipping automatic installation of extensions');
    return false;
  }
  try {
    ({env, util, logger} = require('@appium/support'));
    // @ts-ignore This is OK
    ({runExtensionCommand} = require('../build/lib/cli/extension'));
    ({DRIVER_TYPE, PLUGIN_TYPE} = require('../build/lib/constants'));
    // @ts-ignore This is OK
    ({loadExtensions} = require('../build/lib/extension'));
    logger.getLogger('Appium').level = 'error';

    // if we're doing `npm install -g appium` then we will assume we don't have a local appium.
    if (!process.env.npm_config_global && (await env.hasAppiumDependency(process.cwd()))) {
      log(`Found local Appium installation; skipping automatic installation of extensions.`);
      return false;
    }
    return true;
  } catch {
    log('Dev environment likely; skipping automatic installation of extensions');
    return false;
  }
}

async function main() {
  if (!(await init())) {
    return;
  }

  const driverEnv = process.env.npm_config_drivers;
  const pluginEnv = process.env.npm_config_plugins;

  const spinner = ora({
    text: 'Looking for extensions to automatically install...',
    prefixText: '[Appium]',
  }).start();

  if (!driverEnv && !pluginEnv) {
    spinner.succeed(
      wrap(`No drivers or plugins to automatically install.
      If desired, provide arguments with comma-separated values "--drivers=<known_driver>[,known_driver...]" and/or "--plugins=<known_plugin>[,known_plugin...]" to the "npm install appium" command. The specified extensions will be installed automatically with Appium.  Note: to see the list of known extensions, run "appium <driver|plugin> list".`)
    );
    return;
  }

  /**
   * @type {[[typeof DRIVER_TYPE, string?], [typeof PLUGIN_TYPE, string?]]}
   */
  const specs = [
    [DRIVER_TYPE, driverEnv],
    [PLUGIN_TYPE, pluginEnv],
  ];

  spinner.start('Resolving Appium home directory...');
  const appiumHome = await env.resolveAppiumHome();
  spinner.succeed(`Found Appium home: ${appiumHome}`);

  spinner.start('Loading extension data...');
  const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);
  spinner.succeed('Loaded extension data.');

  const installedStats = {[DRIVER_TYPE]: 0, [PLUGIN_TYPE]: 0};
  for (const [type, extEnv] of specs) {
    if (extEnv) {
      for await (let ext of extEnv.split(',')) {
        ext = ext.trim();
        try {
          await checkAndInstallExtension({
            runExtensionCommand,
            appiumHome,
            type,
            ext,
            driverConfig,
            pluginConfig,
            spinner,
          });
          installedStats[type]++;
        } catch (e) {
          spinner.fail(`Could not install ${type} "${ext}": ${e.message}`);
          if (process.env.CI) {
            process.exitCode = 1;
          }
          return;
        }
      }
    }
  }
  spinner.succeed(
    `Done. ${installedStats[DRIVER_TYPE]} ${util.pluralize(
      'driver',
      installedStats[DRIVER_TYPE]
    )} and ${installedStats[PLUGIN_TYPE]} ${util.pluralize(
      'plugin',
      installedStats[PLUGIN_TYPE]
    )} are installed.`
  );
}

/**
 * @privateRemarks the two `@ts-ignore` directives here are because I have no idea what's wrong with
 * the types and don't want to spend more time on it. regardless, it seems to work for now.
 * @param {CheckAndInstallExtensionsOpts} opts
 */
async function checkAndInstallExtension({
  runExtensionCommand,
  appiumHome,
  type,
  ext,
  driverConfig,
  pluginConfig,
  spinner,
}) {
  const extList = await runExtensionCommand(
    // @ts-ignore This is OK
    {
      appiumHome,
      subcommand: type,
      [`${type}Command`]: 'list',
      showInstalled: true,
      suppressOutput: true,
    },
    type === DRIVER_TYPE ? driverConfig : pluginConfig
  );
  if (extList[ext]) {
    spinner.info(`The ${type} "${ext}" is already installed.`);
    return;
  }
  spinner.start(`Installing ${type} "${ext}"...`);
  await runExtensionCommand(
    // @ts-ignore this is OK
    {
      subcommand: type,
      appiumHome,
      [`${type}Command`]: 'install',
      suppressOutput: true,
      [type]: ext,
    },
    type === DRIVER_TYPE ? driverConfig : pluginConfig
  );
  spinner.succeed(`Installed ${type} "${ext}".`);
}

if (require.main === module) {
  main().catch((e) => {
    log(e);
    process.exitCode = 1;
  });
}

module.exports = main;

/**
 * @typedef CheckAndInstallExtensionsOpts
 * @property {typeof runExtensionCommand} runExtensionCommand
 * @property {string} appiumHome
 * @property {DRIVER_TYPE | PLUGIN_TYPE} type
 * @property {string} ext
 * @property {import('../lib/extension/driver-config').DriverConfig} driverConfig
 * @property {import('../lib/extension/plugin-config').PluginConfig} pluginConfig
 * @property {import('ora').Ora} spinner
 */
