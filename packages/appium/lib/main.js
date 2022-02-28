#!/usr/bin/env node

// transpile:main
// @ts-check

import { init as logsinkInit } from './logsink'; // this import needs to come first since it sets up global npmlog
import logger from './logger'; // logger needs to remain second
// @ts-ignore
import { routeConfiguringFunction as makeRouter, server as baseServer } from '@appium/base-driver';
import { logger as logFactory, util, env } from '@appium/support';
import { asyncify } from 'asyncbox';
import _ from 'lodash';
import { AppiumDriver } from './appium';
import { runExtensionCommand } from './cli/extension';
import { getParser } from './cli/parser';
import { APPIUM_VER, checkNodeOk, getGitRev, getNonDefaultServerArgs, showConfig, showBuildInfo, validateTmpDir, warnNodeDeprecations } from './config';
import { readConfigFile } from './config-file';
import { loadExtensions, getActivePlugins, getActiveDrivers } from './extension';
import { DRIVER_TYPE, PLUGIN_TYPE, SERVER_SUBCOMMAND } from './constants';
import registerNode from './grid-register';
import { finalizeSchema, getDefaultsForSchema, validate } from './schema/schema';
import { inspect } from './utils';

const {resolveAppiumHome} = env;

/**
 *
 * @param {ParsedArgs} args
 * @param {boolean} [throwInsteadOfExit]
 */
async function preflightChecks (args, throwInsteadOfExit = false) {
  try {
    checkNodeOk();
    if (args.longStacktrace) {
      require('longjohn').async_trace_limit = -1;
    }
    if (args.showBuildInfo) {
      await showBuildInfo();
      process.exit(0);
    }
    warnNodeDeprecations();

    validate(args);

    if (args.tmpDir) {
      await validateTmpDir(args.tmpDir);
    }
  } catch (err) {
    logger.error(err.message.red);
    if (throwInsteadOfExit) {
      throw err;
    }

    process.exit(1);
  }
}

/**
 * @param {Partial<ParsedArgs>} args
 */
function logNonDefaultArgsWarning (args) {
  logger.info('Non-default server args:');
  inspect(args);
}

function logDefaultCapabilitiesWarning (caps) {
  logger.info('Default capabilities, which will be added to each request ' +
              'unless overridden by desired capabilities:');
  inspect(caps);
}

/**
 * @param {ParsedArgs} args
 */
async function logStartupInfo (args) {
  let welcome = `Welcome to Appium v${APPIUM_VER}`;
  let appiumRev = await getGitRev();
  if (appiumRev) {
    welcome += ` (REV ${appiumRev})`;
  }
  logger.info(welcome);

  let showArgs = getNonDefaultServerArgs(args);
  if (_.size(showArgs)) {
    logNonDefaultArgsWarning(showArgs);
  }
  if (!_.isEmpty(args.defaultCapabilities)) {
    logDefaultCapabilitiesWarning(args.defaultCapabilities);
  }
  // TODO: bring back loglevel reporting below once logger is flushed out
  // logger.info('Console LogLevel: ' + logger.transports.console.level);
  // if (logger.transports.file) {
  //   logger.info('File LogLevel: ' + logger.transports.file.level);
  // }
}

/**
 * Logs the address and port the server is listening on
 * @param {string} address - Address
 * @param {number} port - Port
 * @returns {void}
 */
function logServerPort (address, port) {
  let logMessage = `Appium REST http interface listener started on ` +
                   `${address}:${port}`;
  logger.info(logMessage);
}

/**
 * Gets a list of `updateServer` functions from all extensions
 * @param {DriverClass[]} driverClasses
 * @param {PluginClass[]} pluginClasses
 * @returns {import('./extension/manifest').UpdateServerFn[]}
 */
function getServerUpdaters (driverClasses, pluginClasses) {
  return _.compact(_.map([...driverClasses, ...pluginClasses], 'updateServer'));
}

/**
 * Makes a big `MethodMap` from all the little `MethodMap`s in the extensions
 * @param {DriverClass[]} driverClasses
 * @param {PluginClass[]} pluginClasses
 * @returns {import('@appium/base-driver').MethodMap}
 */
function getExtraMethodMap (driverClasses, pluginClasses) {
  return [...driverClasses, ...pluginClasses].reduce(
    (map, klass) => ({...map, ...klass.newMethodMap}),
    {}
  );
}

/**
 * Initializes extensions and finalizes the argument schema.
 *
 * Prepares Appium to accept arguments by way of {@linkcode configure}.
 *
 * Returns object containing configuration objects for plugins and drivers.
 * @param {string} [appiumHome] - `APPIUM_HOME` if known
 * @returns {Promise<ExtensionConfigs>}
 */
async function init (appiumHome) {
  const extConfigs = await loadExtensions(appiumHome ?? await resolveAppiumHome());
  finalizeSchema();
  return extConfigs;
}

/**
 * Configures Appium with arguments, but does not start the server.
 *
 * Typically {@linkcode init} will provide the {@link ExtensionConfigs} object `extensionConfigs`.
 * If `args` contains a non-empty `subcommand` _which is not `server`_, this function will return an {@link ExtCommandConfigureResult empty object}.
 *
 * @param {ExtensionConfigs} extensionConfigs - Extension configs (see {@linkcode init})
 * @param {PartialArgs} [args] - Partial args (progammatic usage only)
 * @returns {Promise<ConfigureResult | ExtCommandConfigureResult>}
 **/
async function configure ({driverConfig, pluginConfig}, args) {
  let throwInsteadOfExit = false;
  /** @type {ParsedArgs} */
  let preConfigParsedArgs;
  /** @type {ParsedArgs} */
  let parsedArgs;
  /**
   * This is a definition (instead of declaration) because TS can't figure out
   * the value will be defined when it's used.
   * @type {ReturnType<getDefaultsForSchema>}
   */
  let defaults = {};

  const argParser = getParser(args?.throwInsteadOfExit);

  if (args) {
    // if we have a containing package instead of running as a CLI process,
    // that package might not appreciate us calling 'process.exit' willy-
    // nilly, so give it the option to have us throw instead of exit
    if (args.throwInsteadOfExit) {
      throwInsteadOfExit = true;
      // but remove it since it's not a real server arg per se
      delete args.throwInsteadOfExit;
    }
    preConfigParsedArgs = /** @type {ParsedArgs} */({...args, subcommand: args.subcommand ?? SERVER_SUBCOMMAND});
  } else {
    // otherwise parse from CLI
    preConfigParsedArgs = argParser.parseArgs();
  }

  const configResult = await readConfigFile(preConfigParsedArgs.configFile);

  if (!_.isEmpty(configResult.errors)) {
    throw new Error(`Errors in config file ${configResult.filepath}:\n ${configResult.reason ?? configResult.errors}`);
  }

  // merge config and apply defaults.
  // the order of precendece is:
  // 1. command line args
  // 2. config file
  // 3. defaults from config file.
  if (preConfigParsedArgs.subcommand === SERVER_SUBCOMMAND) {
    defaults = getDefaultsForSchema(false);

    parsedArgs = _.defaultsDeep(
      preConfigParsedArgs,
      configResult.config?.server,
      defaults
    );

    if (preConfigParsedArgs.showConfig) {
      showConfig(getNonDefaultServerArgs(preConfigParsedArgs), configResult, defaults, parsedArgs);
      return {};
    }

  } else {
    parsedArgs = preConfigParsedArgs;
  }

  await logsinkInit(parsedArgs);

  // if the user has requested the 'driver' CLI, don't run the normal server,
  // but instead pass control to the driver CLI
  if (parsedArgs.subcommand === DRIVER_TYPE) {
    await runExtensionCommand(parsedArgs, driverConfig);
    return {};
  }
  if (parsedArgs.subcommand === PLUGIN_TYPE) {
    await runExtensionCommand(parsedArgs, pluginConfig);
    return {};
  }

  if (parsedArgs.logFilters) {
    const {issues, rules} = await logFactory.loadSecureValuesPreprocessingRules(parsedArgs.logFilters);
    if (!_.isEmpty(issues)) {
      throw new Error(`The log filtering rules config '${parsedArgs.logFilters}' has issues: ` +
        JSON.stringify(issues, null, 2));
    }
    if (_.isEmpty(rules)) {
      logger.warn(`Found no log filtering rules in '${parsedArgs.logFilters}'. Is that expected?`);
    } else {
      logger.info(`Loaded ${util.pluralize('filtering rule', rules.length, true)} from '${parsedArgs.logFilters}'`);
    }
  }

  const appiumDriver = new AppiumDriver(parsedArgs);
  // set the config on the umbrella driver so it can match drivers to caps
  appiumDriver.driverConfig = driverConfig;
  await preflightChecks(parsedArgs, throwInsteadOfExit);

  return /** @type {ConfigureResult} */({appiumDriver, parsedArgs});
}

/**
 * Tracks Appium's own `process` listeners to avoid setting them multiple times.
 * @type {Map<string,(...args: any[]) => Promise<void>>}
 */
const processListeners = new Map();

/**
 * Configures signal handlers for this process.
 *
 * If Appium has already set listeners for the signals in question, it removes the old ones before proceeding.
 * @param {import('./appium').AppiumDriver} appiumDriver
 */
function setupProcessListeners (appiumDriver) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    if (processListeners.has(signal)) {
      process.removeListener(signal, /** @type {(...args: any[]) => Promise<void>} **/(processListeners.get(signal)));
    }
    /**
     * Force-kills all active sessions, disconnect sockets & stops server.
     * @this {typeof process}
     * @returns {Promise<never>} Does _not_ resolve/reject; exits
     */
    const onSignal = async function () {
      logger.info(`Received ${signal} - shutting down`);
      // XXX: `process.exit()` is synchronous and is not particularly safe unless your call stack is
      // entirely synchronous. better to set `process.exitCode` and let Node.js exit gracefully. if
      // `appiumDriver.server.close()` works like it's supposed to, then it should!
      try {
        await appiumDriver.deleteAllSessions({
          force: true,
          reason: `The process has received ${signal} signal`,
        });
        await appiumDriver.server?.close();
        process.exit(0);
      } catch (e) {
        logger.warn(e);
        process.exit(1);
      }
    };
    processListeners.set(signal, onSignal);
    process.once(signal, onSignal);
  }
}

/**
 * Given a {@linkcode PluginConfig}, {@linkcode DriverConfig}, {@link ParsedArgs parsed arguments} and an {@linkcode AppiumDriver} instance, start the Appium server and listen on the configured port.
 * @param {StartParams} params
 * @returns {Promise<import('./appium').AppiumDriver['server']>}
 */
async function start ({pluginConfig, driverConfig, parsedArgs, appiumDriver}) {

  const pluginClasses = getActivePlugins(pluginConfig, parsedArgs.usePlugins);
  // set the active plugins on the umbrella driver so it can use them for commands
  appiumDriver.pluginClasses = pluginClasses;

  await logStartupInfo(parsedArgs);
  let routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = getActiveDrivers(driverConfig, parsedArgs.useDrivers);
  const serverUpdaters = getServerUpdaters(driverClasses, pluginClasses);
  const extraMethodMap = getExtraMethodMap(driverClasses, pluginClasses);

  const serverOpts = {
    routeConfiguringFunction,
    port: parsedArgs.port,
    hostname: parsedArgs.address,
    allowCors: parsedArgs.allowCors,
    basePath: parsedArgs.basePath,
    serverUpdaters,
    extraMethodMap,
  };
  if (parsedArgs.keepAliveTimeout) {
    serverOpts.keepAliveTimeout = parsedArgs.keepAliveTimeout * 1000;
  }
  let server;
  try {
    server = await baseServer(serverOpts);
  } catch (err) {
    logger.error(`Could not configure Appium server. It's possible that a driver or plugin tried ` +
                 `to update the server and failed. Original error: ${err.message}`);
    logger.debug(err.stack);
    return process.exit(1);
  }

  if (parsedArgs.allowCors) {
    logger.warn('You have enabled CORS requests from any host. Be careful not ' +
                'to visit sites which could maliciously try to start Appium ' +
                'sessions on your machine');
  }
  appiumDriver.server = server;
  try {
    // configure as node on grid, if necessary
    // falsy values should not cause this to run
    if (parsedArgs.nodeconfig) {
      await registerNode(parsedArgs.nodeconfig, parsedArgs.address, parsedArgs.port, parsedArgs.basePath);
    }
  } catch (err) {
    await server.close();
    throw err;
  }

  setupProcessListeners(appiumDriver);

  logServerPort(parsedArgs.address, parsedArgs.port);
  driverConfig.print();
  pluginConfig.print(pluginClasses.map((p) => p.pluginName));

  return server;
}

/**
 * {@link configure Loads extensions}, {@link init parses arguments and configuration}, then {@link start  starts the Appium server}.
 * @param {PartialArgs} [args] - Programmatic arguments.
 * @returns {Promise<ReturnType<typeof start>|undefined>}
 */
async function main (args) {
  const extConfigs = await init(args?.appiumHome);

  const {appiumDriver, parsedArgs} = /** @type {ConfigureResult} */(await configure(extConfigs, args));

  if (!appiumDriver || !parsedArgs) {
    // if this branch is taken, we've run a different subcommand, so there's nothing
    // left to do here.
    return;
  }

  return await start({...extConfigs, parsedArgs, appiumDriver});
}

// NOTE: this is here for backwards compat for any scripts referencing `main.js` directly
// (more specifically, `build/lib/main.js`)
// the executable is now `../index.js`, so that module will typically be `require.main`.
if (require.main === module) {
  asyncify(main);
}

// everything below here is intended to be a public API.
export { readConfigFile } from './config-file';
export { finalizeSchema, getSchema, validate } from './schema/schema';
export { main, init, configure, start, resolveAppiumHome };

/**
 * @typedef {import('../types/types').ParsedArgs} ParsedArgs
 */

/**
 * @typedef {import('../types/types').PartialArgs} PartialArgs
 * @typedef {import('./extension/manifest').DriverType} DriverType
 * @typedef {import('./extension/manifest').PluginType} PluginType
 * @typedef {import('./extension/manifest').DriverClass} DriverClass
 * @typedef {import('./extension/manifest').PluginClass} PluginClass
 */

/**
 * Returned from {@linkcode configure} when an extension subcommand (`driver`/`plugin`) was provided by the user.
 * @typedef { {} } ExtCommandConfigureResult
 */

/**
 * @typedef {Object} BaseInitData
 * @property {import('./cli/parser').ArgParser} argParser
 */

/**
 * @typedef ServerInitData
 * @property {AppiumDriver} appiumDriver - The Appium driver
 * @property {ParsedArgs} parsedArgs - The parsed arguments
 */

/**
 * @typedef {import('./extension').ExtensionConfigs} ExtensionConfigs
 * @typedef {ExtensionConfigs & ConfigureResult} StartParams
 */

/**
 * @typedef {Object} InitOptions
 * @property {string} [appiumHome] - The path to the Appium home directory
 * @property {boolean} [throwInsteadOfExit] - If `true`, arg parser will throw instead of exiting on error
 */
