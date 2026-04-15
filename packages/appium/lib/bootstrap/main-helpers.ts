import {inspect as dump, type InspectOptions} from 'node:util';
import {log as logger} from '../logger';
import {
  routeConfiguringFunction as makeRouter,
  normalizeBasePath,
  server as baseServer,
  type ServerOpts,
} from '@appium/base-driver';
import _ from 'lodash';
import type {AppiumServer, Driver, MethodMap, UpdateServerCallback} from '@appium/types';
import {WebSocketServer} from 'ws';
import type {NetworkInterfaceInfo} from 'node:os';
import type {AppiumDriver} from '../appium';
import {APPIUM_VER, getBuildInfo, getGitRev, updateBuildInfo} from '../helpers/build';
import {checkNodeOk, requireDir} from './node-helpers';
import {getNonDefaultServerArgs} from './startup-config';
import {validate as validateSchema} from '../schema/schema';
import {fetchInterfaces, V4_BROADCAST_IP, isBroadcastIp} from '../helpers/network';
import {LONG_STACKTRACE_LIMIT, BIDI_BASE_PATH} from '../constants';
import type {Args, ParsedArgs, CliCommandServer} from 'appium/types';
import type {DriverNameMap, PluginNameMap} from '../extension';

const isStdoutTTY = process.stdout.isTTY;

/**
 * Logs a value to the console using the info logger (with util.inspect formatting).
 */
export const inspect = _.flow(
  _.partialRight(dump as (object: unknown, options: InspectOptions) => string, {
    colors: true,
    depth: null,
    compact: !isStdoutTTY,
  }),
  (...args: unknown[]) => {
    logger.info(...args);
  },
);

/**
 * Prints the current build info JSON to stdout.
 *
 * This updates build metadata first (using GitHub fallback) and then logs the
 * resulting {@link BuildInfo} object.
 */
export async function showBuildInfo(): Promise<void> {
  await updateBuildInfo(true);
  // eslint-disable-next-line no-console -- CLI output for --build-info
  console.log(JSON.stringify(getBuildInfo()));
}

/**
 * Human-readable label for where Appium resolved `APPIUM_HOME` from (CLI, env, or autodetect).
 */
export function determineAppiumHomeSource(appiumHomeFromArgs?: string | null): string {
  if (!_.isNil(appiumHomeFromArgs)) {
    return 'appiumHome config value';
  }
  if (process.env.APPIUM_HOME) {
    return 'APPIUM_HOME environment variable';
  }
  return 'autodetected Appium home path';
}

/**
 * Logs the REST listener URL; if the bind address is a broadcast address, lists concrete interface URLs.
 */
export function logServerAddress(url: string): void {
  const urlObj = new URL(url);
  logger.info(`Appium REST http interface listener started on ${url}`);
  if (!isBroadcastIp(urlObj.hostname)) {
    return;
  }

  const interfaces = fetchInterfaces(urlObj.hostname === V4_BROADCAST_IP ? 4 : 6);
  const toLabel = (iface: NetworkInterfaceInfo) => {
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
 * Validates Node version, optional long stack traces, schema, tmp dir, and `--build-info` early exit.
 *
 * @param args - Parsed server CLI args
 * @param throwInsteadOfExit - When true, rethrows failures instead of calling `process.exit(1)`
 */
export async function preflightChecks(
  args: ParsedArgs<CliCommandServer>,
  throwInsteadOfExit = false,
): Promise<void> {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error((message as string & {red: string}).red);
    if (throwInsteadOfExit) {
      throw err;
    }

    process.exit(1);
  }
}

/**
 * Prints welcome line (version + optional git rev), non-default server args, and default capabilities.
 */
export async function logStartupInfo(args: ParsedArgs<CliCommandServer>): Promise<void> {
  let welcome = `Welcome to Appium v${APPIUM_VER}`;
  const appiumRev = await getGitRev();
  if (appiumRev) {
    welcome += ` (REV ${appiumRev})`;
  }
  logger.info(welcome);

  const showArgs = getNonDefaultServerArgs(args);
  if (_.size(showArgs)) {
    logNonDefaultArgsWarning(showArgs);
  }
  if (!_.isEmpty(args.defaultCapabilities)) {
    logDefaultCapabilitiesWarning(args.defaultCapabilities);
  }
}

/**
 * Collects `updateServer` hooks from active driver and plugin classes for HTTP server customization.
 */
export function getServerUpdaters(
  driverClasses: DriverNameMap,
  pluginClasses: PluginNameMap,
): UpdateServerCallback[] {
  return _.compact(_.map([...driverClasses.keys(), ...pluginClasses.keys()], 'updateServer'));
}

/**
 * Merges `newMethodMap` contributions from all active drivers and plugins into one method map.
 */
export function getExtraMethodMap(driverClasses: DriverNameMap, pluginClasses: PluginNameMap): MethodMap<Driver> {
  return [...driverClasses.keys(), ...pluginClasses.keys()].reduce<MethodMap<Driver>>(
    (map, klass) => ({
      ...map,
      ...(klass.newMethodMap ?? {}),
    }),
    {},
  );
}

/**
 * Builds {@link ServerOpts} and normalized base path for the Appium HTTP server from CLI args and extensions.
 */
export function buildServerOpts(
  appiumDriver: AppiumDriver,
  parsedArgs: ParsedArgs<CliCommandServer>,
  driverClasses: DriverNameMap,
  pluginClasses: PluginNameMap,
): {serverOpts: ServerOpts; normalizedBasePath: string} {
  const routeConfiguringFunction = makeRouter(appiumDriver);
  const serverOpts: ServerOpts = {
    routeConfiguringFunction,
    port: parsedArgs.port,
    hostname: parsedArgs.address,
    allowCors: parsedArgs.allowCors,
    basePath: parsedArgs.basePath,
    serverUpdaters: getServerUpdaters(driverClasses, pluginClasses),
    extraMethodMap: getExtraMethodMap(driverClasses, pluginClasses),
    cliArgs: parsedArgs,
  };
  const normalizedBasePath = normalizeBasePath(parsedArgs.basePath);
  for (const timeoutArgName of ['keepAliveTimeout', 'requestTimeout'] as const) {
    if (_.isInteger(parsedArgs[timeoutArgName])) {
      serverOpts[timeoutArgName] = parsedArgs[timeoutArgName] * 1000;
    }
  }
  return {serverOpts, normalizedBasePath};
}

/**
 * Creates the Appium HTTP server and attaches WebSocket handlers for BiDi under the normalized base path.
 */
export async function createAppiumServer(
  serverOpts: ServerOpts,
  appiumDriver: AppiumDriver,
  normalizedBasePath: string,
): Promise<AppiumServer> {
  const bidiServer = new WebSocketServer({noServer: true});
  bidiServer.on('connection', appiumDriver.onBidiConnection.bind(appiumDriver));
  bidiServer.on('error', appiumDriver.onBidiServerError.bind(appiumDriver));
  const server = await baseServer(serverOpts);
  const bidiBasePath = `${normalizedBasePath}${BIDI_BASE_PATH}`;
  await server.addWebSocketHandler(bidiBasePath, bidiServer);
  await server.addWebSocketHandler(`${bidiBasePath}/:sessionId`, bidiServer);
  return server;
}

function logNonDefaultArgsWarning(args: Args): void {
  logger.info('Non-default server args:');
  inspect(args);
}

function logDefaultCapabilitiesWarning(caps: ParsedArgs<CliCommandServer>['defaultCapabilities']): void {
  logger.info(
    'Default capabilities, which will be added to each request ' +
      'unless overridden by desired capabilities:',
  );
  inspect(caps);
}
