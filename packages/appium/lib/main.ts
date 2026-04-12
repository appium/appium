import {WebSocketServer} from 'ws';
import {init as logsinkInit} from './logsink'; // this import needs to come first since it sets up global npmlog
import logger from './logger'; // logger needs to remain second
import {
  routeConfiguringFunction as makeRouter,
  server as baseServer,
  normalizeBasePath,
  type ServerOpts,
} from '@appium/base-driver';
import {util, env} from '@appium/support';
import _ from 'lodash';
import type {AppiumServer, Driver, DriverOpts, MethodMap, UpdateServerCallback} from '@appium/types';
import {AppiumDriver, type AppiumDriverConstraints} from './appium';
import {runExtensionCommand} from './cli/extension';
import {runSetupCommand} from './cli/setup-command';
import {getParser, ArgParser} from './cli/parser';
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
import {loadExtensions, getActivePlugins, getActiveDrivers, type DriverNameMap, type PluginNameMap, type ExtensionConfigs} from './extension';
import {SERVER_SUBCOMMAND, LONG_STACKTRACE_LIMIT, BIDI_BASE_PATH} from './constants';
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
import type {NetworkInterfaceInfo} from 'node:os';
import {injectAppiumSymlinks} from './cli/extension-command';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliExtensionSubcommand,
  CliCommandSetupSubcommand,
  ParsedArgs,
} from 'appium/types';

/*
 * By default Node.js shows a warning
 * if the actual amount of listeners exceeds the maximum amount,
 * which equals to 10 by default. It is known that multiple drivers/plugins
 * may assign custom listeners to the server process to handle, for example,
 * the graceful shutdown scenario.
 */
const MAX_SERVER_PROCESS_LISTENERS = 100;

/**
 * Initializes Appium, but does not start the server.
 *
 * Use this to get at the configuration schema.
 *
 * If `args` contains a non-empty `subcommand` which is not `server`, this function will return an empty object.
 */
export async function init<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
>(args?: Args<Cmd, SubCmd>): Promise<InitResult<Cmd>> {
  const appiumHome = args?.appiumHome ?? (await env.resolveAppiumHome());
  const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
  await requireDir(appiumHome, false, appiumHomeSourceName);

  adjustNodePath();

  const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);

  const parser = getParser();
  let throwInsteadOfExit = false;
  let preConfigArgs: PreConfigArgs;

  if (args) {
    if (args.throwInsteadOfExit) {
      throwInsteadOfExit = true;
      delete args.throwInsteadOfExit;
    }
    preConfigArgs = {...args, subcommand: args.subcommand ?? SERVER_SUBCOMMAND} as PreConfigArgs;
    ArgParser.normalizeServerArgs(preConfigArgs);
  } else {
    preConfigArgs = parser.parseArgs() as PreConfigArgs;
  }

  const configResult = await readConfigFile(preConfigArgs.configFile);

  if (!_.isEmpty(configResult.errors)) {
    throw new Error(
      `Errors in config file ${configResult.filepath}:\n ${configResult.reason ?? configResult.errors}`,
    );
  }

  if (isServerCommandArgs(preConfigArgs)) {
    const defaults = getDefaultsForSchema(false);

    const serverArgs = _.defaultsDeep(
      {},
      preConfigArgs,
      configResult.config?.server,
      defaults,
    ) as ParsedArgs<CliCommandServer>;

    if (preConfigArgs.showConfig) {
      showConfig(getNonDefaultServerArgs(preConfigArgs), configResult, defaults, serverArgs);
      return {} as InitResult<Cmd>;
    }

    if (preConfigArgs.showDebugInfo) {
      await showDebugInfo({
        driverConfig,
        pluginConfig,
        appiumHome,
      });
      return {} as InitResult<Cmd>;
    }

    await logsinkInit(serverArgs);

    if (serverArgs.logFilters) {
      const {issues, rules} = await logger.unwrap().loadSecureValuesPreprocessingRules(serverArgs.logFilters);
      const argToLog = _.truncate(JSON.stringify(serverArgs.logFilters), {
        length: 150,
      });
      if (!_.isEmpty(issues)) {
        throw new Error(
          `The log filtering rules config ${argToLog} has issues: ` + JSON.stringify(issues, null, 2),
        );
      }
      if (_.isEmpty(rules)) {
        logger.warn(
          `Found no log filtering rules in the ${argToLog} config. ` + `Is that expected?`,
        );
      } else {
        logger.info(`Loaded ${util.pluralize('filtering rule', rules.length, true)}`);
      }
    }

    if (!serverArgs.noPermsCheck) {
      await requireDir(appiumHome, true, appiumHomeSourceName);
    }

    const appiumDriver = new AppiumDriver(serverArgs as DriverOpts<AppiumDriverConstraints>);
    appiumDriver.driverConfig = driverConfig;
    await preflightChecks(serverArgs, throwInsteadOfExit);

    return {
      appiumDriver,
      parsedArgs: serverArgs,
      driverConfig,
      pluginConfig,
      appiumHome,
    } as InitResult<Cmd>;
  }

  if (isSetupCommandArgs(preConfigArgs)) {
    await runSetupCommand(preConfigArgs, driverConfig, pluginConfig);
    return {} as InitResult<Cmd>;
  }

  await requireDir(appiumHome, true, appiumHomeSourceName);
  if (isExtensionCommandArgs(preConfigArgs)) {
    if (isDriverCommandArgs(preConfigArgs)) {
      await runExtensionCommand(preConfigArgs, driverConfig);
    }
    if (isPluginCommandArgs(preConfigArgs)) {
      await runExtensionCommand(preConfigArgs, pluginConfig);
    }

    if (isDriverCommandArgs(preConfigArgs) || isPluginCommandArgs(preConfigArgs)) {
      const cmd = isDriverCommandArgs(preConfigArgs)
        ? preConfigArgs.driverCommand
        : preConfigArgs.pluginCommand;
      if (cmd === 'install') {
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);
      }
    }
  }
  return {} as InitResult<Cmd>;
}

function logServerAddress(url: string): void {
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
 * Initializes Appium's config. Starts server if appropriate and resolves the
 * server instance if so; otherwise resolves with `undefined`.
 */
export async function main<
  Cmd extends CliCommand = CliCommandServer,
  SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
>(args?: Args<Cmd, SubCmd>): Promise<Cmd extends CliCommandServer ? AppiumServer : void> {
  const initResult = await init(args);

  if (_.isEmpty(initResult)) {
    return undefined as Cmd extends CliCommandServer ? AppiumServer : void;
  }

  const {appiumDriver, pluginConfig, driverConfig, parsedArgs, appiumHome} = initResult as ServerInitData;

  const pluginClasses = await getActivePlugins(
    pluginConfig,
    parsedArgs.pluginsImportChunkSize,
    parsedArgs.usePlugins,
  );
  for (const [pluginClass, name] of pluginClasses) {
    appiumDriver.pluginClasses.set(pluginClass, name);
  }

  await logStartupInfo(parsedArgs);

  appiumDriver.configureGlobalFeatures();

  const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
  logger.debug(`The ${appiumHomeSourceName}: ${appiumHome}`);

  const routeConfiguringFunction = makeRouter(appiumDriver);

  const driverClasses = await getActiveDrivers(
    driverConfig,
    parsedArgs.driversImportChunkSize,
    parsedArgs.useDrivers,
  );
  const serverUpdaters = getServerUpdaters(driverClasses, pluginClasses);
  const extraMethodMap = getExtraMethodMap(driverClasses, pluginClasses);

  const serverOpts: ServerOpts = {
    routeConfiguringFunction,
    port: parsedArgs.port,
    hostname: parsedArgs.address,
    allowCors: parsedArgs.allowCors,
    basePath: parsedArgs.basePath,
    serverUpdaters,
    extraMethodMap,
    cliArgs: parsedArgs,
  };
  const normalizedBasePath = normalizeBasePath(parsedArgs.basePath);
  for (const timeoutArgName of ['keepAliveTimeout', 'requestTimeout'] as const) {
    if (_.isInteger(parsedArgs[timeoutArgName])) {
      serverOpts[timeoutArgName] = parsedArgs[timeoutArgName] * 1000;
    }
  }
  let server: AppiumServer;
  const bidiServer = new WebSocketServer({noServer: true});
  bidiServer.on('connection', appiumDriver.onBidiConnection.bind(appiumDriver));
  bidiServer.on('error', appiumDriver.onBidiServerError.bind(appiumDriver));
  try {
    server = await baseServer(serverOpts);
    const bidiBasePath = `${normalizedBasePath}${BIDI_BASE_PATH}`;
    server.addWebSocketHandler(bidiBasePath, bidiServer);
    server.addWebSocketHandler(`${bidiBasePath}/:sessionId`, bidiServer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error(
      `Could not configure Appium server. It's possible that a driver or plugin tried ` +
        `to update the server and failed. Original error: ${message}`,
    );
    logger.debug(stack);
    process.exit(1);
    return undefined as Cmd extends CliCommandServer ? AppiumServer : void;
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
    if (parsedArgs.nodeconfig) {
      await registerNode(
        parsedArgs.nodeconfig,
        parsedArgs.address,
        parsedArgs.port,
        normalizedBasePath,
      );
    }
  } catch (err: unknown) {
    await server.close();
    throw err;
  }

  process.setMaxListeners(MAX_SERVER_PROCESS_LISTENERS);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async function onSignal() {
      logger.info(`Received ${signal} - shutting down`);
      try {
        await appiumDriver.shutdown(`The process has received ${signal} signal`);
        await server.close();
        process.exit(0);
      } catch (e: unknown) {
        logger.warn(e);
        process.exit(1);
      }
    });
  }

  const protocol = server.isSecure() ? 'https' : 'http';
  const address = net.isIPv6(parsedArgs.address) ? `[${parsedArgs.address}]` : parsedArgs.address;
  logServerAddress(`${protocol}://${address}:${parsedArgs.port}${normalizedBasePath}`);

  driverConfig.print();
  pluginConfig.print([...pluginClasses.values()]);

  return server as Cmd extends CliCommandServer ? AppiumServer : void;
}


async function preflightChecks(args: ParsedArgs<CliCommandServer>, throwInsteadOfExit = false): Promise<void> {
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

async function logStartupInfo(args: ParsedArgs<CliCommandServer>): Promise<void> {
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

function getServerUpdaters(
  driverClasses: DriverNameMap,
  pluginClasses: PluginNameMap,
): UpdateServerCallback[] {
  return _.compact(_.map([...driverClasses.keys(), ...pluginClasses.keys()], 'updateServer'));
}

function getExtraMethodMap(driverClasses: DriverNameMap, pluginClasses: PluginNameMap): MethodMap<Driver> {
  return [...driverClasses.keys(), ...pluginClasses.keys()].reduce<MethodMap<Driver>>(
    (map, klass) => ({
      ...map,
      ...(klass.newMethodMap ?? {}),
    }),
    {},
  );
}

function determineAppiumHomeSource(appiumHomeFromArgs?: string | null): string {
  if (!_.isNil(appiumHomeFromArgs)) {
    return 'appiumHome config value';
  }
  if (process.env.APPIUM_HOME) {
    return 'APPIUM_HOME environment variable';
  }
  return 'autodetected Appium home path';
}

// NOTE: backwards compat for scripts referencing `build/lib/main.js` directly.
// The executable is `../index.js`, so that module will typically be `require.main`.
if (require.main === module) {
  void main();
}

// Re-export helpers from the same package so `import { … } from 'appium'` stays a supported
// programmatic API (this file is the package `types` entry). The monorepo does not import these
// from `'appium'`; consumers use local paths or `@appium/support`. Dropping them is semver-major.
export {readConfigFile} from './config-file';
export {finalizeSchema, getSchema, validate} from './schema/schema';

// ---------------------------------------------------------------------------
// Public API types (package `types` → `build/lib/main.d.ts`)
//
// CLI / server arg shapes (`Args`, `ParsedArgs`, `CliCommand`, …) live in `appium/types`.
// Driver and plugin classes (`DriverClass`, `PluginType`, …) live in `@appium/types`.
// ---------------------------------------------------------------------------

/** Non-server branch: `init` resolves to an empty object. */
export type ExtCommandInitResult = Record<string, never>;

export type ServerInitData = ExtensionConfigs & {
  appiumDriver: AppiumDriver;
  parsedArgs: ParsedArgs<CliCommandServer>;
  appiumHome: string;
};

export type InitResult<Cmd extends CliCommand = CliCommandServer> = Cmd extends CliCommandServer
  ? ServerInitData
  : ExtCommandInitResult;

// ---------------------------------------------------------------------------
// Module-private types
// ---------------------------------------------------------------------------

/** CLI + programmatic args before `init` narrows by `subcommand`. */
type PreConfigArgs = Args<CliCommand, CliExtensionSubcommand | CliCommandSetupSubcommand | void>;
