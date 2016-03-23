#!/usr/bin/env node
// transpile:main

import { init as logsinkInit } from './logsink';
import logger from './logger'; // logger needs to remain first of imports
import _ from 'lodash';
import { default as baseServer } from 'appium-express';
import { asyncify } from 'asyncbox';
import getParser from './parser';
import { showConfig, checkNodeOk, validateServerArgs,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, APPIUM_VER } from './config';
import getAppiumRouter from './appium';
import registerNode from './grid-register';
import util from 'util';


async function preflightChecks (parser, args) {
  try {
    checkNodeOk();
    if (args.asyncTrace) {
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
  for (let [arg, value] of _.toPairs(args)) {
    logger.info(`  ${arg}: ${util.inspect(value)}`);
  }
}

function logDefaultCapabilitiesWarning (caps) {
  logger.info('Default capabilities, which will be added to each request ' +
              'unless overridden by desired capabilities:');
  util.inspect(caps);
  for (let [cap, value] of _.toPairs(caps)) {
    logger.info(`  ${cap}: ${util.inspect(value)}`);
  }
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
  //logger.info('Console LogLevel: ' + logger.transports.console.level);
  //if (logger.transports.file) {
    //logger.info('File LogLevel: ' + logger.transports.file.level);
  //}
}

function logServerPort (address, port) {
  let logMessage = `Appium REST http interface listener started on ` +
                   `${address}:${port}`;
  logger.info(logMessage);
}

async function main (args = null) {
  let parser = getParser();
  if (!args) {
    args = parser.parseArgs();
  }
  await logsinkInit(args);
  await preflightChecks(parser, args);
  await logStartupInfo(parser, args);
  let router = getAppiumRouter(args);
  let server = await baseServer(router, args.port, args.address);
  try {
    // TODO prelaunch if args.launch is set
    // TODO: startAlertSocket(server, appiumServer);

    // configure as node on grid, if necessary
    if (args.nodeconfig !== null) {
      await registerNode(args.nodeconfig, args.address, args.port);
    }
  } catch (err) {
    server.close();
    throw err;
  }
  logServerPort(args.address, args.port);

  return server;
}

if (require.main === module) {
  asyncify(main);
}

export { main };
