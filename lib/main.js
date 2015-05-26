// transpile:main

import logger from './logger'; // logger needs to remain first of imports
import _ from 'lodash';
import { server as baseServer } from 'appium-express';
import { asyncify } from 'asyncbox';
import getParser from './parser';
import { showConfig, checkNodeOk, validateServerArgs,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, APPIUM_VER } from './config';
import { getAppiumRouter } from './appium';

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

async function logStartupInfo (parser, args) {
  let welcome = `Welcome to Appium v${APPIUM_VER}`;
  let appiumRev = await getGitRev();
  if (appiumRev) {
    welcome += ` (REV ${appiumRev})`;
  }
  logger.info(welcome);
  let logMessage = "Appium REST http interface listener started on " +
                   args.address + ":" + args.port;
  logger.info(logMessage);
  let showArgs = getNonDefaultArgs(parser, args);
  if (_.size(showArgs)) {
    logger.debug("Non-default server args: " + JSON.stringify(showArgs));
  }
  let deprecatedArgs = getDeprecatedArgs(parser, args);
  if (_.size(deprecatedArgs)) {
    logger.warn("Deprecated server args: " + JSON.stringify(deprecatedArgs));
  }
  // TODO: bring back loglevel reporting below once logger is flushed out
  //logger.info('Console LogLevel: ' + logger.transports.console.level);
  //if (logger.transports.file) {
    //logger.info('File LogLevel: ' + logger.transports.file.level);
  //}
}

async function main () {
  let parser = getParser();
  let args = parser.parseArgs();
  await preflightChecks(parser, args);
  let router = getAppiumRouter(args);
  let server = await baseServer(router, args.port, args.address);
  try {
    // TODO prelaunch if args.launch is set
    // TODO: startAlertSocket(server, appiumServer);
    // TODO: nodeconfig
    //if (args.nodeconfig !== null) {
      //gridRegister.registerNode(args.nodeconfig, args.address, args.port);
    //}
    await logStartupInfo(parser, args);
  } catch (e) {
    server.close();
    throw e;
  }
  return server;
}

if (require.main === module) {
  asyncify(main);
}

