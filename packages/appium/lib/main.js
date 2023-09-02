#!/usr/bin/env node

import {init as logsinkInit} from './logsink'; // this import needs to come first since it sets up global npmlog
import logger from './logger'; // logger needs to remain second
import {
  routeConfiguringFunction as makeRouter,
  server as baseServer,
  normalizeBasePath,
} from '@appium/base-driver';
import {logger as logFactory, util, env, fs} from '@appium/support';
import {asyncify} from 'asyncbox';
import _ from 'lodash';
import {AppiumDriver} from './appium';
import {runExtensionCommand} from './cli/extension';
import {getParser} from './cli/parser';
import {
  APPIUM_VER,
  checkNodeOk,
  getGitRev,
  getNonDefaultServerArgs,
  showConfig,
  showBuildInfo,
  validateTmpDir,
  warnNodeDeprecations,
  checkNpmOk,
} from './config';
import {readConfigFile} from './config-file';
import {loadExtensions, getActivePlugins, getActiveDrivers} from './extension';
import {SERVER_SUBCOMMAND, LONG_STACKTRACE_LIMIT} from './constants';
import registerNode from './grid-register';
import {getDefaultsForSchema, validate} from './schema/schema';
import {
  inspect,
  adjustNodePath,
  isDriverCommandArgs,
  isExtensionCommandArgs,
  isPluginCommandArgs,
  isServerCommandArgs,
  fetchInterfaces,
  V4_BROADCAST_IP,
  V6_BROADCAST_IP,
} from './utils';
import os from 'node:os';
import net from 'node:net';

const {resolveAppiumHome} = env;

/**
 *
 * @param {ParsedArgs} args
 * @param {boolean} [throwInsteadOfExit]
 */
async function preflightChecks(args, throwInsteadOfExit = false) {
  try {
    checkNodeOk();
    await checkNpmOk();
    if (args.longStacktrace) {
      Error.stackTraceLimit = LONG_STACKTRACE_LIMIT;
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
      'unless overridden by desired capabilities:'
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
    {}
  );
}

/**
 * Prepares and validates appium home path folder
 *
 * @param {string} name The name of the appium home source (needed for error messages)
 * @param {string} appiumHome The actual value to be verified
 * @returns {Promise<string>} Same appiumHome value
 * @throws {Error} If the validation has failed
 */
async function prepareAppiumHome(name, appiumHome) {
  let stat;
  try {
    stat = await fs.stat(appiumHome);
  } catch (e) {
    let err = e;
    if (e.code === 'ENOENT') {
      try {
        await fs.mkdir(appiumHome, {recursive: true});
        return appiumHome;
      } catch (e1) {
        err = e1;
      }
    }
    throw new Error(
      `The path '${appiumHome}' provided in the ${name} must point ` +
        `to a valid folder writeable for the current user account '${os.userInfo().username}'. ` +
        `Original error: ${err.message}`
    );
  }
  if (!stat.isDirectory()) {
    throw new Error(
      `The path '${appiumHome}' provided in the ${name} must point to a valid folder`
    );
  }
  try {
    await fs.access(appiumHome, fs.constants.W_OK);
  } catch (e) {
    throw new Error(
      `The folder path '${appiumHome}' provided in the ${name} must be ` +
        `writeable for the current user account '${os.userInfo().username}. ` +
        `Original error: ${e.message}`
    );
  }
  return appiumHome;
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
  let appiumHomeSourceName = 'autodetected appium home path';
  if (!_.isNil(args?.appiumHome)) {
    appiumHomeSourceName = 'appiumHome config value';
  } else if (process.env.APPIUM_HOME) {
    appiumHomeSourceName = 'APPIUM_HOME environment variable';
  }
  await prepareAppiumHome(appiumHomeSourceName, appiumHome);

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
      }`
    );
  }

  // merge config and apply defaults.
  // the order of precendece is:
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

    await logsinkInit(serverArgs);

    if (serverArgs.logFilters) {
      const {issues, rules} = await logFactory.loadSecureValuesPreprocessingRules(
        serverArgs.logFilters
      );
      if (!_.isEmpty(issues)) {
        throw new Error(
          `The log filtering rules config '${serverArgs.logFilters}' has issues: ` +
            JSON.stringify(issues, null, 2)
        );
      }
      if (_.isEmpty(rules)) {
        logger.warn(
          `Found no log filtering rules in '${serverArgs.logFilters}'. Is that expected?`
        );
      } else {
        logger.info(
          `Loaded ${util.pluralize('filtering rule', rules.length, true)} from '${
            serverArgs.logFilters
          }'`
        );
      }
    }

    const appiumDriver = new AppiumDriver(
      /** @type {import('@appium/types').DriverOpts<import('./appium').AppiumDriverConstraints>} */ (
        serverArgs
      )
    );
    // set the config on the umbrella driver so it can match drivers to caps
    appiumDriver.driverConfig = driverConfig;
    await preflightChecks(serverArgs, throwInsteadOfExit);

    return /** @type {InitResult<Cmd>} */ ({
      appiumDriver,
      parsedArgs: serverArgs,
      driverConfig,
      pluginConfig,
    });
  } else {
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
  if (![V4_BROADCAST_IP, V6_BROADCAST_IP, `[${V6_BROADCAST_IP}]`].includes(urlObj.hostname)) {
    return;
  }

  const interfaces = fetchInterfaces(urlObj.hostname === V4_BROADCAST_IP ? 4 : 6);
  const toLabel = (/** @type {os.NetworkInterfaceInfo} */ iface) => {
    const href = urlObj.href.replace(urlObj.hostname, iface.address);
    return iface.internal
      ? `${href} (only accessible from the same host)`
      : href;
  };
  logger.info(
    `You can provide the following ${interfaces.length === 1 ? 'URL' : 'URLs'} ` +
    `in your client code to connect to this server:\n` +
    interfaces.map((iface) => `\t${toLabel(iface)}`).join('\n')
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

  const {appiumDriver, pluginConfig, driverConfig, parsedArgs} =
    /** @type {InitResult<ServerCommand>} */ (initResult);

  const pluginClasses = getActivePlugins(pluginConfig, parsedArgs.usePlugins);
  // set the active plugins on the umbrella driver so it can use them for commands
  appiumDriver.pluginClasses = pluginClasses;

  await logStartupInfo(parsedArgs);
  let routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = getActiveDrivers(driverConfig, parsedArgs.useDrivers);
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
  try {
    server = await baseServer(serverOpts);
  } catch (err) {
    logger.error(
      `Could not configure Appium server. It's possible that a driver or plugin tried ` +
        `to update the server and failed. Original error: ${err.message}`
    );
    logger.debug(err.stack);
    return process.exit(1);
  }

  if (parsedArgs.allowCors) {
    logger.warn(
      'You have enabled CORS requests from any host. Be careful not ' +
        'to visit sites which could maliciously try to start Appium ' +
        'sessions on your machine'
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
        parsedArgs.basePath
      );
    }
  } catch (err) {
    await server.close();
    throw err;
  }

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

  const protocol = 'secure' in server && server.secure ? 'https' : 'http';
  const address = net.isIPv6(parsedArgs.address) ? `[${parsedArgs.address}]` : parsedArgs.address;
  logServerAddress(`${protocol}://${address}:${parsedArgs.port}${normalizeBasePath(parsedArgs.basePath)}`);

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
