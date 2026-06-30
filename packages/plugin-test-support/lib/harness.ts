import {createRequire} from 'node:module';
import net from 'node:net';

/* eslint-disable no-console */
import type {AppiumServer} from '@appium/types';
import {main as appiumServer} from 'appium';
import {fs} from 'appium/support';
import AsyncLock from 'async-lock';
import {exec} from 'teen_process';

import type {AppiumEnv, E2ESetupOpts} from './types';

declare const __filename: string;
const _require = createRequire(__filename);
const APPIUM_BIN = _require.resolve('appium') as string;
const lock = new AsyncLock();

const logSymbols = {
  info: 'ℹ',
  success: '✔',
  warning: '⚠',
  error: '✖',
} as const;

/**
 * Creates hooks to install a driver and a plugin and starts an Appium server w/ the given extensions.
 *
 * @param opts - Options for the plugin E2E harness
 * @returns An object with `setup` and `teardown` callbacks
 * @throws {Error} If a free port could not be found
 * @throws {Error} If the Appium server could not be started
 * @throws {Error} If the driver could not be installed
 * @throws {Error} If the plugin could not be installed
 */
export function pluginE2EHarness(opts: E2ESetupOpts): {
  setup: () => Promise<{
    server: AppiumServer;
  }>;
  teardown: () => Promise<void>;
} {
  const {
    appiumHome,
    serverArgs = {},
    driverSource,
    driverPackage,
    driverName,
    driverSpec,
    pluginSource,
    pluginPackage,
    pluginSpec,
    pluginName,
    port,
    host,
  } = opts;

  let server: AppiumServer | undefined;

  const setup = async function setup() {
    const setupAppiumHome = async (): Promise<AppiumEnv> => {
      const env: AppiumEnv = {...process.env};

      if (appiumHome) {
        env.APPIUM_HOME = appiumHome;
        await fs.mkdirp(appiumHome);
        console.log(`${logSymbols.info} Set \`APPIUM_HOME\` to ${appiumHome}`);
      }

      return env;
    };

    const installDriver = async (env: AppiumEnv): Promise<void> => {
      console.log(`${logSymbols.info} Checking if driver "${driverName}" is installed...`);
      const driverListArgs = [APPIUM_BIN, 'driver', 'list', '--json'];
      console.log(`${logSymbols.info} Running: ${process.execPath} ${driverListArgs.join(' ')}`);
      const {stdout: driverListJson} = await exec(process.execPath, driverListArgs, {
        env,
      });
      const installedDrivers = JSON.parse(driverListJson) as Record<string, {installed?: boolean}>;

      if (!installedDrivers[driverName]?.installed) {
        console.log(`${logSymbols.warning} Driver "${driverName}" not installed; installing...`);
        const driverArgs = [APPIUM_BIN, 'driver', 'install', '--source', driverSource, driverSpec];
        if (driverPackage) {
          driverArgs.push('--package', driverPackage);
        }
        console.log(`${logSymbols.info} Running: ${process.execPath} ${driverArgs.join(' ')}`);
        await exec(process.execPath, driverArgs, {
          env,
        });
      }
      console.log(`${logSymbols.success} Installed driver "${driverName}"`);
    };

    const installPlugin = async (env: AppiumEnv): Promise<void> => {
      console.log(`${logSymbols.info} Checking if plugin "${pluginName}" is installed...`);
      const pluginListArgs = [APPIUM_BIN, 'plugin', 'list', '--json'];
      const {stdout: pluginListJson} = await exec(process.execPath, pluginListArgs, {
        env,
      });
      const installedPlugins = JSON.parse(pluginListJson) as Record<string, {installed?: boolean}>;

      if (!installedPlugins[pluginName]?.installed) {
        console.log(`${logSymbols.warning} Plugin "${pluginName}" not installed; installing...`);
        const pluginArgs = [APPIUM_BIN, 'plugin', 'install', '--source', pluginSource, pluginSpec];
        if (pluginPackage) {
          pluginArgs.push('--package', pluginPackage);
        }
        console.log(`${logSymbols.info} Running: ${process.execPath} ${pluginArgs.join(' ')}`);
        await exec(process.execPath, pluginArgs, {
          env,
        });
      }
      console.log(`${logSymbols.success} Installed plugin "${pluginName}"`);
    };

    const startAppiumServer = async (): Promise<void> => {
      const resolvedPort = port ?? (await getPort());
      console.log(`${logSymbols.info} Will use port ${resolvedPort} for Appium server`);

      const args = {
        port: resolvedPort,
        address: host,
        usePlugins: [pluginName],
        useDrivers: [driverName],
        appiumHome,
        ...serverArgs,
      };
      server = (await appiumServer(args)) as AppiumServer;
    };

    const env = await setupAppiumHome();
    await installDriver(env);
    await installPlugin(env);
    await startAppiumServer();
    return {server: server as AppiumServer};
  };

  const teardown = async function teardown() {
    await server?.close();
  };

  return {
    setup,
    teardown,
  };
}

/**
 * Returns a first available free port number on the local machine.
 * The function call is race-free and thread-safe.
 *
 * @returns Port number
 * @throws {Error} If a free port could not be found
 */
export async function getPort(): Promise<number> {
  return await lock.acquire('getPort', async () => {
    const server = net.createServer();
    return await new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close(() => reject(new Error('Could not resolve a free port')));
          return;
        }
        server.close((err) => (err ? reject(err) : resolve(address.port)));
      });
    });
  });
}
