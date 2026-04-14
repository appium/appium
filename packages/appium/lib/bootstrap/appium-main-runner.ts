import {log as logger} from '../logger';
import _ from 'lodash';
import type {AppiumServer} from '@appium/types';
import {getActivePlugins, getActiveDrivers} from '../extension';
import registerNode from './grid-v3-register';
import {
  determineAppiumHomeSource,
  logStartupInfo,
  buildServerOpts,
  createAppiumServer,
  logServerAddress,
} from './main-helpers';
import type {InitResult, ServerInitData} from './init-types';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliCommandSetupSubcommand,
  CliExtensionSubcommand,
} from 'appium/types';
import type {ServerOpts} from '@appium/base-driver';
import net from 'node:net';

const MAX_SERVER_PROCESS_LISTENERS = 100;

/**
 * Starts the Appium HTTP server after {@link AppiumInitializer.init}: loads drivers/plugins, binds, grid register, signals.
 */
export class AppiumMainRunner {
  /**
   * For server init: builds listeners, registers with Grid 3 if configured, and returns the server.
   * For non-server commands, `initResult` is empty and this resolves to `undefined`.
   *
   * @param initResult - Output of {@link AppiumInitializer.init}
   * @param args - Original args (used to describe `appiumHome` source in logs)
   */
  async run<
    Cmd extends CliCommand = CliCommandServer,
    SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
  >(initResult: InitResult<Cmd>, args?: Args<Cmd, SubCmd>): Promise<Cmd extends CliCommandServer ? AppiumServer : void> {
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

    const driverClasses = await getActiveDrivers(
      driverConfig,
      parsedArgs.driversImportChunkSize,
      parsedArgs.useDrivers,
    );
    const {serverOpts, normalizedBasePath} = buildServerOpts(
      appiumDriver,
      parsedArgs,
      driverClasses,
      pluginClasses,
    );

    const server = await this.startHttpServer(serverOpts, appiumDriver, normalizedBasePath);
    if (!server) {
      return undefined as Cmd extends CliCommandServer ? AppiumServer : void;
    }

    this.warnIfCorsEnabled(parsedArgs);
    appiumDriver.server = server;

    await this.registerGridOrClose(server, parsedArgs, normalizedBasePath);
    this.attachSignalHandlers(appiumDriver, server);
    this.logListeningUrl(server, parsedArgs, normalizedBasePath);

    driverConfig.print();
    pluginConfig.print([...pluginClasses.values()]);

    return server as Cmd extends CliCommandServer ? AppiumServer : void;
  }

  private async startHttpServer(
    serverOpts: ServerOpts,
    appiumDriver: ServerInitData['appiumDriver'],
    normalizedBasePath: string,
  ): Promise<AppiumServer | undefined> {
    try {
      return await createAppiumServer(serverOpts, appiumDriver, normalizedBasePath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      logger.error(
        `Could not configure Appium server. It's possible that a driver or plugin tried ` +
          `to update the server and failed. Original error: ${message}`,
      );
      logger.debug(stack);
      process.exit(1);
      return undefined;
    }
  }

  private warnIfCorsEnabled(parsedArgs: ServerInitData['parsedArgs']): void {
    if (parsedArgs.allowCors) {
      logger.warn(
        'You have enabled CORS requests from any host. Be careful not ' +
          'to visit sites which could maliciously try to start Appium ' +
          'sessions on your machine',
      );
    }
  }

  private async registerGridOrClose(
    server: AppiumServer,
    parsedArgs: ServerInitData['parsedArgs'],
    normalizedBasePath: string,
  ): Promise<void> {
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
  }

  private attachSignalHandlers(
    appiumDriver: ServerInitData['appiumDriver'],
    server: AppiumServer,
  ): void {
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
  }

  private logListeningUrl(
    server: AppiumServer,
    parsedArgs: ServerInitData['parsedArgs'],
    normalizedBasePath: string,
  ): void {
    const protocol = server.isSecure() ? 'https' : 'http';
    const address = net.isIPv6(parsedArgs.address) ? `[${parsedArgs.address}]` : parsedArgs.address;
    logServerAddress(`${protocol}://${address}:${parsedArgs.port}${normalizedBasePath}`);
  }
}
