#!/usr/bin/env node

// transpile:main
// @ts-check

// @ts-ignore
import { routeConfiguringFunction as makeRouter, server as baseServer } from '@appium/base-driver';
import { logger as logFactory, util } from '@appium/support';
import { asyncify } from 'asyncbox';
import _ from 'lodash';
import { AppiumDriver } from './appium';
import { driverConfig, pluginConfig, USE_ALL_PLUGINS } from './cli/args';
import { runExtensionCommand } from './cli/extension';
import { default as getParser, SERVER_SUBCOMMAND } from './cli/parser';
import { APPIUM_VER, checkNodeOk, getGitRev, getNonDefaultServerArgs, showConfig, validateTmpDir, warnNodeDeprecations } from './config';
import { readConfigFile } from './config-file';
import { DRIVER_TYPE, PLUGIN_TYPE } from './extension-config';
import registerNode from './grid-register';
import logger from './logger'; // logger needs to remain first of imports
import { init as logsinkInit } from './logsink';
import { getDefaultsFromSchema, validate } from './schema/schema';
import { inspectObject } from './utils';

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
    if (args.showConfig) {
      await showConfig();
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

function logNonDefaultArgsWarning (args) {
  logger.info('Non-default server args:');
  inspectObject(args);
}

function logDefaultCapabilitiesWarning (caps) {
  logger.info('Default capabilities, which will be added to each request ' +
              'unless overridden by desired capabilities:');
  inspectObject(caps);
}

async function logStartupInfo (parser, args) {
  let welcome = `Welcome to Appium v${APPIUM_VER}`;
  let appiumRev = await getGitRev();
  if (appiumRev) {
    welcome += ` (REV ${appiumRev})`;
  }
  logger.info(welcome);

  let showArgs = getNonDefaultServerArgs(parser, args);
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

function logServerPort (address, port) {
  let logMessage = `Appium REST http interface listener started on ` +
                   `${address}:${port}`;
  logger.info(logMessage);
}

/**
 * Find any plugin name which has been installed, and which has been requested for activation by
 * using the --plugins flag, and turn each one into its class, so we can send them as objects to
 * the server init. We also want to send/assign them to the umbrella driver so it can use them to
 * wrap command execution
 *
 * @param {Object} args - argparser parsed dict
 * @param {import('./plugin-config').default} pluginConfig - a plugin extension config
 * @returns {({pluginName: string} & ((...args: any[]) => unknown))[]}
 */
function getActivePlugins (args, pluginConfig) {
  return _.compact(Object.keys(pluginConfig.installedExtensions).filter((pluginName) =>
    _.includes(args.usePlugins, pluginName) ||
    (args.usePlugins.length === 1 && args.usePlugins[0] === USE_ALL_PLUGINS)
  ).map((pluginName) => {
    try {
      logger.info(`Attempting to load plugin ${pluginName}...`);
      const PluginClass = /** @type {{pluginName: string} & ((...args: any[]) => unknown)} */(pluginConfig.require(pluginName));

      PluginClass.pluginName = pluginName; // store the plugin name on the class so it can be used later
      return PluginClass;
    } catch (err) {
      logger.error(`Could not load plugin '${pluginName}', so it will not be available. Error ` +
                   `in loading the plugin was: ${err.message}`);
      logger.debug(err.stack);
    }
  }));
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 * If the --drivers flag was given, this method only loads the given drivers.
 *
 * @param {Object} args - argparser parsed dict
 * @param {import('./driver-config').default} driverConfig - a driver extension config
 */
function getActiveDrivers (args, driverConfig) {
  return _.compact(Object.keys(driverConfig.installedExtensions).filter((driverName) =>
    _.includes(args.useDrivers, driverName) || args.useDrivers.length === 0
  ).map((driverName) => {
    try {
      logger.info(`Attempting to load driver ${driverName}...`);
      return driverConfig.require(driverName);
    } catch (err) {
      logger.error(`Could not load driver '${driverName}', so it will not be available. Error ` +
                   `in loading the driver was: ${err.message}`);
      logger.debug(err.stack);
    }
  }));
}

function getServerUpdaters (driverClasses, pluginClasses) {
  return [...driverClasses, ...pluginClasses].map((klass) => klass.updateServer).filter(Boolean);
}

function getExtraMethodMap (driverClasses, pluginClasses) {
  return [...driverClasses, ...pluginClasses].reduce(
    (map, klass) => ({...map, ...klass.newMethodMap}),
    {}
  );
}

/**
 * Initializes Appium, but does not start the server.
 *
 * Use this to get at the configuration schema.
 *
 * @example
 * import {init, getSchema} from 'appium';
 * const options = {}; // config object
 * await init(options);
 * const schema = getSchema(); // entire config schema including plugins and drivers
 * @param {ParsedArgs} [args] - Parsed args
 * @returns {Promise<{parser: import('./cli/parser').ArgParser} & Partial<{appiumDriver: AppiumDriver, parsedArgs: ParsedArgs}>>}
 */
async function init (args) {
  const parser = await getParser();
  let throwInsteadOfExit = false;
  /** @type {ParsedArgs} */
  let parsedArgs;
  if (args) {
    // if we have a containing package instead of running as a CLI process,
    // that package might not appreciate us calling 'process.exit' willy-
    // nilly, so give it the option to have us throw instead of exit
    if (args.throwInsteadOfExit) {
      throwInsteadOfExit = true;
      // but remove it since it's not a real server arg per se
      delete args.throwInsteadOfExit;
    }
    parsedArgs = {...args, subcommand: args.subcommand ?? SERVER_SUBCOMMAND};
  } else {
    // otherwise parse from CLI
    parsedArgs = parser.parseArgs();
  }

  const configResult = await readConfigFile(parsedArgs.configFile);

  if (!_.isEmpty(configResult.errors)) {
    throw new Error(`Errors in config file ${configResult.filepath}:\n ${configResult.reason ?? configResult.errors}`);
  }

  // merge config and apply defaults.
  // the order of precendece is:
  // 1. command line args
  // 2. config file
  // 3. defaults from config file.
  if (parsedArgs.subcommand === SERVER_SUBCOMMAND) {
    parsedArgs = _.defaultsDeep(
      parsedArgs,
      configResult.config?.server,
      getDefaultsFromSchema()
    );
  }

  parsedArgs = _.defaultsDeep(
    parsedArgs,
    configResult.config ?? {},
  );

  await logsinkInit(parsedArgs);

  // if the user has requested the 'driver' CLI, don't run the normal server,
  // but instead pass control to the driver CLI
  if (parsedArgs.subcommand === DRIVER_TYPE) {
    await runExtensionCommand(parsedArgs, parsedArgs.subcommand, driverConfig);
    return {parser};
  }
  if (parsedArgs.subcommand === PLUGIN_TYPE) {
    await runExtensionCommand(parsedArgs, parsedArgs.subcommand, pluginConfig);
    return {parser};
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

  return {parser, appiumDriver, parsedArgs};
}

/**
 *
 * @param {ParsedArgs} [args]
 * @returns
 */
async function main (args) {
  const {parser, appiumDriver, parsedArgs} = await init(args);

  if (!appiumDriver || !parsedArgs) {
    // if this branch is taken, we've run a different subcommand, so there's nothing
    // left to do here.
    return;
  }

  const pluginClasses = getActivePlugins(parsedArgs, pluginConfig);
  // set the active plugins on the umbrella driver so it can use them for commands
  appiumDriver.pluginClasses = pluginClasses;

  await logStartupInfo(parser, parsedArgs);
  let routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = getActiveDrivers(parsedArgs, driverConfig);
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
  // @ts-ignore
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

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async function onSignal () {
      logger.info(`Received ${signal} - shutting down`);
      try {
        await appiumDriver.deleteAllSessions({
          force: true,
          reason: `The process has received ${signal} signal`,
        });
        await server.close();
        process.exit(0);
      } catch (e) {
        logger.warn(e);
        process.exit(1);
      }
    });
  }

  logServerPort(parsedArgs.address, parsedArgs.port);
  driverConfig.print();
  pluginConfig.print(pluginClasses.map((p) => p.pluginName));

  return server;
}

if (require.main === module) {
  asyncify(main);
}

// everything below here is intended to be a public API.
export { main, init };
export { APPIUM_HOME } from './extension-config';
export { getSchema, validate, finalizeSchema } from './schema/schema';
export { readConfigFile } from './config-file';

/**
 * @typedef {import('../types/types').ParsedArgs} ParsedArgs
 */
