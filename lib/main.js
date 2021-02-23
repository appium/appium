#!/usr/bin/env node
// transpile:main

import { init as logsinkInit } from './logsink';
import logger from './logger'; // logger needs to remain first of imports
import _ from 'lodash';
import { server as baseServer, routeConfiguringFunction as makeRouter } from 'appium-base-driver';
import { asyncify } from 'asyncbox';
import { default as getParser, getDefaultServerArgs } from './cli/parser';
import { USE_ALL_PLUGINS } from './cli/args';
import { logger as logFactory, util } from 'appium-support';
import {
  showConfig, checkNodeOk, validateServerArgs,
  warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
  getGitRev, APPIUM_VER
} from './config';
import DriverConfig from './driver-config';
import PluginConfig from './plugin-config';
import { DRIVER_TYPE, PLUGIN_TYPE } from './extension-config';
import { runExtensionCommand } from './cli/extension';
import { AppiumDriver } from './appium';
import registerNode from './grid-register';
import { inspectObject } from './utils';


async function preflightChecks ({parser, args, driverConfig, pluginConfig, throwInsteadOfExit = false}) {
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
    validateServerArgs(parser, args);
    await driverConfig.read();
    await pluginConfig.read();
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

  let showArgs = getNonDefaultArgs(parser, args);
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
 * @param {PluginConfig} pluginConfig - a plugin extension config
 */
function getActivePlugins (args, pluginConfig) {
  return Object.keys(pluginConfig.installedExtensions).filter((pluginName) =>
    _.includes(args.plugins, pluginName) ||
    (args.plugins.length === 1 && args.plugins[0] === USE_ALL_PLUGINS)
  ).map((pluginName) => {
    try {
      logger.info(`Attempting to load plugin ${pluginName}...`);
      const PluginClass = pluginConfig.require(pluginName);
      PluginClass.pluginName = pluginName; // store the plugin name on the class so it can be used later
      return PluginClass;
    } catch (err) {
      logger.error(`Could not load plugin '${pluginName}', so it will not be available. Error ` +
                   `in loading the plugin was: ${err.message}`);
      logger.debug(err.stack);
      return false;
    }
  }).filter(Boolean);
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 *
 * @param {DriverConfig} driverConfig - a driver extension config
 */
function getActiveDrivers (driverConfig) {
  return Object.keys(driverConfig.installedExtensions).map((driverName) => {
    try {
      logger.info(`Attempting to load driver ${driverName}...`);
      return driverConfig.require(driverName);
    } catch (err) {
      logger.error(`Could not load driver '${driverName}', so it will not be available. Error ` +
                   `in loading the driver was: ${err.message}`);
      logger.debug(err.stack);
      return false;
    }
  }).filter(Boolean);
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

async function main (args = null) {
  let parser = getParser();
  let throwInsteadOfExit = false;
  if (args) {
    // a containing package passed in their own args, let's fill them out
    // with defaults
    args = Object.assign({}, getDefaultServerArgs(), args);

    // if we have a containing package instead of running as a CLI process,
    // that package might not appreciate us calling 'process.exit' willy-
    // nilly, so give it the option to have us throw instead of exit
    if (args.throwInsteadOfExit) {
      throwInsteadOfExit = true;
      // but remove it since it's not a real server arg per se
      delete args.throwInsteadOfExit;
    }
  } else {
    // otherwise parse from CLI
    args = parser.parse_args();
  }
  await logsinkInit(args);

  // if the user has requested the 'driver' CLI, don't run the normal server,
  // but instead pass control to the driver CLI
  if (args.subcommand === DRIVER_TYPE || args.subcommand === PLUGIN_TYPE) {
    await runExtensionCommand(args, args.subcommand);
    process.exit();
  }

  if (args.logFilters) {
    const {issues, rules} = await logFactory.loadSecureValuesPreprocessingRules(args.logFilters);
    if (!_.isEmpty(issues)) {
      throw new Error(`The log filtering rules config '${args.logFilters}' has issues: ` +
        JSON.stringify(issues, null, 2));
    }
    if (_.isEmpty(rules)) {
      logger.warn(`Found no log filtering rules in '${args.logFilters}'. Is that expected?`);
    } else {
      logger.info(`Loaded ${util.pluralize('filtering rule', rules.length, true)} from '${args.logFilters}'`);
    }
  }

  let appiumDriver = new AppiumDriver(args);
  const driverConfig = new DriverConfig(args.appiumHome);
  // set the config on the umbrella driver so it can match drivers to caps
  appiumDriver.driverConfig = driverConfig;
  const pluginConfig = new PluginConfig(args.appiumHome);
  await preflightChecks({parser, args, driverConfig, pluginConfig, throwInsteadOfExit});
  await logStartupInfo(parser, args);
  let routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = getActiveDrivers(driverConfig);
  const pluginClasses = getActivePlugins(args, pluginConfig);
  // set the active plugins on the umbrella driver so it can use them for commands
  appiumDriver.pluginClasses = pluginClasses;

  const serverUpdaters = getServerUpdaters(driverClasses, pluginClasses);
  const extraMethodMap = getExtraMethodMap(driverClasses, pluginClasses);

  const serverOpts = {
    routeConfiguringFunction,
    port: args.port,
    hostname: args.address,
    allowCors: args.allowCors,
    basePath: args.basePath,
    serverUpdaters,
    extraMethodMap,
  };
  if (args.keepAliveTimeout) {
    serverOpts.keepAliveTimeout = args.keepAliveTimeout * 1000;
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

  if (args.allowCors) {
    logger.warn('You have enabled CORS requests from any host. Be careful not ' +
                'to visit sites which could maliciously try to start Appium ' +
                'sessions on your machine');
  }
  appiumDriver.server = server;
  try {
    // configure as node on grid, if necessary
    if (args.nodeconfig !== null) {
      await registerNode(args.nodeconfig, args.address, args.port, args.basePath);
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

  logServerPort(args.address, args.port);
  driverConfig.print();
  pluginConfig.print(pluginClasses.map((p) => p.pluginName));

  return server;
}

if (require.main === module) {
  asyncify(main);
}

export { main };
