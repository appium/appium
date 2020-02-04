#!/usr/bin/env node
// transpile:main

import { init as logsinkInit } from './logsink';
import logger from './logger'; // logger needs to remain first of imports
import _ from 'lodash';
import { server as baseServer, routeConfiguringFunction as makeRouter } from 'appium-base-driver';
import { asyncify } from 'asyncbox';
import { default as getParser, getDefaultArgs } from './parser';
import { showConfig, checkNodeOk, validateServerArgs,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, APPIUM_VER } from './config';
import { AppiumDriver } from './appium';
import registerNode from './grid-register';
import { inspectObject } from './utils';


async function preflightChecks (parser, args, throwInsteadOfExit = false) {
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

function logDeprecationWarning (deprecatedArgs) {
  logger.warn('Deprecated server args:');
  for (let [arg, realArg] of _.toPairs(deprecatedArgs)) {
    logger.warn(`  ${arg.red} => ${realArg}`);
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
  let deprecatedArgs = getDeprecatedArgs(parser, args);
  if (_.size(deprecatedArgs)) {
    logDeprecationWarning(deprecatedArgs);
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

async function main (args = null) {
  let parser = getParser();
  let throwInsteadOfExit = false;
  if (args) {
    // a containing package passed in their own args, let's fill them out
    // with defaults
    args = Object.assign({}, getDefaultArgs(), args);

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
    args = parser.parseArgs();
  }
  await logsinkInit(args);
  await preflightChecks(parser, args, throwInsteadOfExit);
  await logStartupInfo(parser, args);
  let appiumDriver = new AppiumDriver(args);
  let routeConfiguringFunction = makeRouter(appiumDriver);
  let server = await baseServer({
    routeConfiguringFunction,
    port: args.port,
    hostname: args.address,
    allowCors: args.allowCors,
    basePath: args.basePath,
  });
  if (args.allowCors) {
    logger.warn('You have enabled CORS requests from any host. Be careful not ' +
                'to visit sites which could maliciously try to start Appium ' +
                'sessions on your machine');
  }
  appiumDriver.server = server;
  try {
    // TODO prelaunch if args.launch is set
    // TODO: startAlertSocket(server, appiumServer);

    // configure as node on grid, if necessary
    if (args.nodeconfig !== null) {
      await registerNode(args.nodeconfig, args.address, args.port);
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

  return server;
}

if (require.main === module) {
  asyncify(main);
}

export { main };
