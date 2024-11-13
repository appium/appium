#!/usr/bin/env node

import {WebSocketServer} from 'ws';
import {init as logsinkInit} from './logsink'; // this import needs to come first since it sets up global npmlog
import logger from './logger'; // logger needs to remain second
import {
  routeConfiguringFunction as makeRouter,
  server as baseServer,
  normalizeBasePath,
} from '@appium/base-driver';
import {util, env} from '@appium/support';
import {asyncify} from 'asyncbox';
import _ from 'lodash';
import {AppiumDriver} from './appium';
import {runExtensionCommand} from './cli/extension';
import { runSetupCommand } from './cli/setup-command';
import {getParser} from './cli/parser';
import {
  APPIUM_VER,
  checkNodeOk,
  getGitRev,
  getNonDefaultServerArgs,
  showConfig,
  showBuildInfo,
  showDebugInfo,
  requireDir,
} from './config';
import {readConfigFile} from './config-file';
import {loadExtensions, getActivePlugins, getActiveDrivers} from './extension';
import {SERVER_SUBCOMMAND, LONG_STACKTRACE_LIMIT} from './constants';
import registerNode from './grid-register';
import {getDefaultsForSchema, validate as validateSchema} from './schema/schema';
import {
  inspect,
  adjustNodePath,
  isDriverCommandArgs,
  isExtensionCommandArgs,
  isPluginCommandArgs,
  isServerCommandArgs,
  fetchInterfaces,
  V4_BROADCAST_IP,
  isSetupCommandArgs,
  isBroadcastIp,
} from './utils';
import net from 'node:net';

const {resolveAppiumHome} = env;
/*
 * By default Node.js shows a warning
 * if the actual amount of listeners exceeds the maximum amount,
 * which equals to 10 by default. It is known that multiple drivers/plugins
 * may assign custom listeners to the server process to handle, for example,
 * the graceful shutdown scenario.
 */
const MAX_SERVER_PROCESS_LISTENERS = 100;

/**
 *
 * @param {ParsedArgs} args
 * @param {boolean} [throwInsteadOfExit]
 */
async function preflightChecks(args, throwInsteadOfExit = false) {
  try {
    checkNodeOk();
    if (args.longStacktrace) {
      Error.stackTraceLimit = LONG_STACKTRACE_LIMIT;
    }
    if (args.showBuildInfo) {
      await showBuildInfo();
      process.exit(0);
    }

    validateSchema(args);

    if (args.tmpDir) {
      await requireDir(args.tmpDir, !args.noPermsCheck, 'tmpDir argument value');
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
 * @param {Args} args
 */
function logNonDefaultArgsWarning(args) {
  logger.info('Non-default server args:');
  inspect(args);
}

/**
 * @param {Args['defaultCapabilities']} caps
 */
function logDefaultCapabilitiesWarning(caps) {
  logger.info(
    'Default capabilities, which will be added to each request ' +
      'unless overridden by desired capabilities:',
  );
  inspect(caps);
}

/**
 * @param {ParsedArgs} args
 */
async function logStartupInfo(args) {
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
 * Gets a list of `updateServer` functions from all extensions
 * @param {DriverNameMap} driverClasses
 * @param {PluginNameMap} pluginClasses
 * @returns {import('@appium/types').UpdateServerCallback[]}
 */
function getServerUpdaters(driverClasses, pluginClasses) {
  return _.compact(_.map([...driverClasses.keys(), ...pluginClasses.keys()], 'updateServer'));
}

/**
 * Makes a big `MethodMap` from all the little `MethodMap`s in the extensions
 * @param {DriverNameMap} driverClasses
 * @param {PluginNameMap} pluginClasses
 * @returns {import('@appium/types').MethodMap<import('@appium/types').Driver>}
 */
function getExtraMethodMap(driverClasses, pluginClasses) {
  return [...driverClasses.keys(), ...pluginClasses.keys()].reduce(
    (map, klass) => ({
      ...map,
      ...(klass.newMethodMap ?? {}),
    }),
    {},
  );
}

/**
 * @param {string?} [appiumHomeFromArgs] - Appium home value retrieved from progrmmatic server args
 * @returns {string}
 */
function determineAppiumHomeSource(appiumHomeFromArgs) {
  if (!_.isNil(appiumHomeFromArgs)) {
    return 'appiumHome config value';
  } else if (process.env.APPIUM_HOME) {
    return 'APPIUM_HOME environment variable';
  }
  return 'autodetected Appium home path';
}

/**
 * Initializes Appium, but does not start the server.
 *
 * Use this to get at the configuration schema.
 *
 * If `args` contains a non-empty `subcommand` which is not `server`, this function will return an empty object.
 *
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @param {Args<Cmd, SubCmd>} [args] - Partial args (progammatic usage only)
 * @returns {Promise<InitResult<Cmd>>}
 * @example
 * import {init, getSchema} from 'appium';
 * const options = {}; // config object
 * await init(options);
 * const schema = getSchema(); // entire config schema including plugins and drivers
 */
async function init(args) {
  const appiumHome = args?.appiumHome ?? (await resolveAppiumHome());
  const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
  // We verify the writeability later based on requested server arguments
  // Here we just need to make sure the path exists and is a folder
  await requireDir(appiumHome, false, appiumHomeSourceName);

  adjustNodePath();

  const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);

  const parser = getParser();
  let throwInsteadOfExit = false;
  /** @type {Args<Cmd, SubCmd>} */
  let preConfigArgs;

  if (args) {
    // if we have a containing package instead of running as a CLI process,
    // that package might not appreciate us calling 'process.exit' willy-
    // nilly, so give it the option to have us throw instead of exit
    if (args.throwInsteadOfExit) {
      throwInsteadOfExit = true;
      // but remove it since it's not a real server arg per se
      delete args.throwInsteadOfExit;
    }
    preConfigArgs = {...args, subcommand: args.subcommand ?? SERVER_SUBCOMMAND};
  } else {
    // otherwise parse from CLI
    preConfigArgs = /** @type {Args<Cmd, SubCmd>} */ (parser.parseArgs());
  }

  const configResult = await readConfigFile(preConfigArgs.configFile);

  if (!_.isEmpty(configResult.errors)) {
    throw new Error(
      `Errors in config file ${configResult.filepath}:\n ${
        configResult.reason ?? configResult.errors
      }`,
    );
  }

  // merge config and apply defaults.
  // the order of precedence is:
  // 1. command line args
  // 2. config file
  // 3. defaults from config file.
  if (isServerCommandArgs(preConfigArgs)) {
    const defaults = getDefaultsForSchema(false);

    /** @type {ParsedArgs} */
    const serverArgs = _.defaultsDeep({}, preConfigArgs, configResult.config?.server, defaults);

    if (preConfigArgs.showConfig) {
      showConfig(getNonDefaultServerArgs(preConfigArgs), configResult, defaults, serverArgs);
      return /** @type {InitResult<Cmd>} */ ({});
    }

    if (preConfigArgs.showDebugInfo) {
      await showDebugInfo({
        driverConfig,
        pluginConfig,
        appiumHome,
      });
      return /** @type {InitResult<Cmd>} */ ({});
    }

    await logsinkInit(serverArgs);

    if (serverArgs.logFilters) {
      const {issues, rules} = await logger.unwrap().loadSecureValuesPreprocessingRules(
        serverArgs.logFilters,
      );
      const argToLog = _.truncate(JSON.stringify(serverArgs.logFilters), {
        length: 150
      });
      if (!_.isEmpty(issues)) {
        throw new Error(
          `The log filtering rules config ${argToLog} has issues: ` +
            JSON.stringify(issues, null, 2),
        );
      }
      if (_.isEmpty(rules)) {
        logger.warn(
          `Found no log filtering rules in the ${argToLog} config. ` +
          `Is that expected?`,
        );
      } else {
        // Filtering aims to "hide" these values from the log,
        // so it would be nice to not show them in the log as well.
        logger.info(
          `Loaded ${util.pluralize('filtering rule', rules.length, true)}`,
        );
      }
    }

    if (!serverArgs.noPermsCheck) {
      await requireDir(appiumHome, true, appiumHomeSourceName);
    }

    const appiumDriver = new AppiumDriver(
      /** @type {import('@appium/types').DriverOpts<import('./appium').AppiumDriverConstraints>} */ (
        serverArgs
      ),
    );
    // set the config on the umbrella driver so it can match drivers to caps
    appiumDriver.driverConfig = driverConfig;
    await preflightChecks(serverArgs, throwInsteadOfExit);

    return /** @type {InitResult<Cmd>} */ ({
      appiumDriver,
      parsedArgs: serverArgs,
      driverConfig,
      pluginConfig,
      appiumHome,
    });
  } else if (isSetupCommandArgs(preConfigArgs)) {
    await runSetupCommand(preConfigArgs, driverConfig, pluginConfig);
    return /** @type {InitResult<Cmd>} */ ({});
  } else {
    await requireDir(appiumHome, true, appiumHomeSourceName);
    if (isExtensionCommandArgs(preConfigArgs)) {
      // if the user has requested the 'driver' CLI, don't run the normal server,
      // but instead pass control to the driver CLI
      if (isDriverCommandArgs(preConfigArgs)) {
        await runExtensionCommand(preConfigArgs, driverConfig);
      }
      if (isPluginCommandArgs(preConfigArgs)) {
        await runExtensionCommand(preConfigArgs, pluginConfig);
      }
    }
    return /** @type {InitResult<Cmd>} */ ({});
  }
}

/**
 * Prints the actual server address and the list of URLs that
 * could be used to connect to the current server.
 * Properly replaces broadcast addresses in client URLs.
 *
 * @param {string} url The URL the server is listening on
 */
function logServerAddress(url) {
  const urlObj = new URL(url);
  logger.info(`Appium REST http interface listener started on ${url}`);
  if (!isBroadcastIp(urlObj.hostname)) {
    return;
  }

  const interfaces = fetchInterfaces(urlObj.hostname === V4_BROADCAST_IP ? 4 : 6);
  const toLabel = (/** @type {import('node:os').NetworkInterfaceInfo} */ iface) => {
    const href = urlObj.href.replace(urlObj.hostname, iface.address);
    return iface.internal ? `${href} (only accessible from the same host)` : href;
  };
  logger.info(
    `You can provide the following ${interfaces.length === 1 ? 'URL' : 'URLs'} ` +
      `in your client code to connect to this server:\n` +
      interfaces.map((iface) => `\t${toLabel(iface)}`).join('\n'),
  );
}

/**
 * Initializes Appium's config.  Starts server if appropriate and resolves the
 * server instance if so; otherwise resolves w/ `undefined`.
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @param {Args<Cmd, SubCmd>} [args] - Arguments from CLI or otherwise
 * @returns {Promise<Cmd extends ServerCommand ? import('@appium/types').AppiumServer : void>}
 */
async function main(args) {
  const initResult = await init(args);

  if (_.isEmpty(initResult)) {
    // if this branch is taken, we've run a different subcommand, so there's nothing
    // left to do here.
    return /** @type {Cmd extends ServerCommand ? import('@appium/types').AppiumServer : void} */ (
      undefined
    );
  }

  const {appiumDriver, pluginConfig, driverConfig, parsedArgs, appiumHome} =
    /** @type {InitResult<ServerCommand>} */ (initResult);

  const pluginClasses = await getActivePlugins(
    pluginConfig, parsedArgs.pluginsImportChunkSize, parsedArgs.usePlugins
  );
  // set the active plugins on the umbrella driver so it can use them for commands
  appiumDriver.pluginClasses = pluginClasses;

  await logStartupInfo(parsedArgs);

  const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
  logger.debug(`The ${appiumHomeSourceName}: ${appiumHome}`);

  let routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = await getActiveDrivers(
    driverConfig, parsedArgs.driversImportChunkSize, parsedArgs.useDrivers
  );
  const serverUpdaters = getServerUpdaters(driverClasses, pluginClasses);
  const extraMethodMap = getExtraMethodMap(driverClasses, pluginClasses);

  /** @type {import('@appium/base-driver').ServerOpts} */
  const serverOpts = {
    routeConfiguringFunction,
    port: parsedArgs.port,
    hostname: parsedArgs.address,
    allowCors: parsedArgs.allowCors,
    basePath: parsedArgs.basePath,
    serverUpdaters,
    extraMethodMap,
    cliArgs: parsedArgs,
  };
  if (parsedArgs.keepAliveTimeout) {
    serverOpts.keepAliveTimeout = parsedArgs.keepAliveTimeout * 1000;
  }
  let server;
  const bidiServer = new WebSocketServer({noServer: true});
  bidiServer.on('connection', appiumDriver.onBidiConnection.bind(appiumDriver));
  bidiServer.on('error', appiumDriver.onBidiServerError.bind(appiumDriver));
  try {
    server = await baseServer(serverOpts);
    server.addWebSocketHandler('/bidi', bidiServer);
    server.addWebSocketHandler('/bidi/:sessionId', bidiServer);
  } catch (err) {
    logger.error(
      `Could not configure Appium server. It's possible that a driver or plugin tried ` +
        `to update the server and failed. Original error: ${err.message}`,
    );
    logger.debug(err.stack);
    return process.exit(1);
  }

  if (parsedArgs.allowCors) {
    logger.warn(
      'You have enabled CORS requests from any host. Be careful not ' +
        'to visit sites which could maliciously try to start Appium ' +
        'sessions on your machine',
    );
  }
  appiumDriver.server = server;
  try {
    // configure as node on grid, if necessary
    // falsy values should not cause this to run
    if (parsedArgs.nodeconfig) {
      await registerNode(
        parsedArgs.nodeconfig,
        parsedArgs.address,
        parsedArgs.port,
        parsedArgs.basePath,
      );
    }
  } catch (err) {
    await server.close();
    throw err;
  }

  process.setMaxListeners(MAX_SERVER_PROCESS_LISTENERS);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async function onSignal() {
      logger.info(`Received ${signal} - shutting down`);
      try {
        await appiumDriver.shutdown(`The process has received ${signal} signal`);
        await server.close();
        process.exit(0);
      } catch (e) {
        logger.warn(e);
        process.exit(1);
      }
    });
  }

  const protocol = server.isSecure() ? 'https' : 'http';
  const address = net.isIPv6(parsedArgs.address) ? `[${parsedArgs.address}]` : parsedArgs.address;
  logServerAddress(
    `${protocol}://${address}:${parsedArgs.port}${normalizeBasePath(parsedArgs.basePath)}`,
  );

  driverConfig.print();
  pluginConfig.print([...pluginClasses.values()]);

  return /** @type {Cmd extends ServerCommand ? import('@appium/types').AppiumServer : void} */ (
    server
  );
}

// NOTE: this is here for backwards compat for any scripts referencing `main.js` directly
// (more specifically, `build/lib/main.js`)
// the executable is now `../index.js`, so that module will typically be `require.main`.
if (require.main === module) {
  asyncify(main);
}

// everything below here is intended to be a public API.
export {readConfigFile} from './config-file';
export {finalizeSchema, getSchema, validate} from './schema/schema';
export {main, init, resolveAppiumHome};

/**
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('@appium/types').DriverClass} DriverClass
 * @typedef {import('@appium/types').PluginClass} PluginClass
 * @typedef {import('appium/types').CliCommand} CliCommand
 * @typedef {import('appium/types').CliExtensionSubcommand} CliExtensionSubcommand
 * @typedef {import('appium/types').CliExtensionCommand} CliExtensionCommand
 * @typedef {import('appium/types').CliCommandServer} ServerCommand
 * @typedef {import('appium/types').CliCommandDriver} DriverCommand
 * @typedef {import('appium/types').CliCommandPlugin} PluginCommand
 * @typedef {import('appium/types').CliCommandSetup} SetupCommand
 * @typedef {import('./extension').DriverNameMap} DriverNameMap
 * @typedef {import('./extension').PluginNameMap} PluginNameMap
 */

/**
 * Literally an empty object
 * @typedef { {} } ExtCommandInitResult
 */

/**
 * @typedef ServerInitData
 * @property {import('./appium').AppiumDriver} appiumDriver - The Appium driver
 * @property {import('appium/types').ParsedArgs} parsedArgs - The parsed arguments
 * @property {string} appiumHome - The full path to the Appium home folder
 */

/**
 * @template {CliCommand} Cmd
 * @typedef {Cmd extends ServerCommand ? ServerInitData & import('./extension').ExtensionConfigs : ExtCommandInitResult} InitResult
 */

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @typedef {import('appium/types').Args<Cmd, SubCmd>} Args
 */

/**
 * @template {CliCommand} [Cmd=ServerCommand]
 * @template {CliExtensionSubcommand|void} [SubCmd=void]
 * @typedef {import('appium/types').ParsedArgs<Cmd, SubCmd>} ParsedArgs
 */
