/* eslint-disable no-console */
import {createRequire} from 'node:module';
import {fs} from 'appium/support';
import {main as appiumServer} from 'appium';
import getPort from 'get-port';
import logSymbols from 'log-symbols';
import {exec} from 'teen_process';
import type {AppiumServer} from '@appium/types';
import type {E2ESetupOpts, AppiumEnv} from './types';

declare const __filename: string;
const _require = createRequire(__filename);
const APPIUM_BIN = _require.resolve('appium') as string;

/**
 * Creates hooks to install a driver and a plugin and starts an Appium server w/ the given extensions.
 */
export function pluginE2EHarness(opts: E2ESetupOpts): void {
  const {
    appiumHome,
    before,
    after,
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

  before(async function (this: Mocha.Context) {
    // Lazy-load chai so smoke test (node ./build/lib/index.js --smoke-test) does not require it
    const chai = await import('chai');
    const chaiAsPromised = (await import('chai-as-promised')).default;
    chai.use(chaiAsPromised);

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
      const installedDrivers = JSON.parse(driverListJson) as Record<
        string,
        {installed?: boolean}
      >;

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
      const installedPlugins = JSON.parse(pluginListJson) as Record<
        string,
        {installed?: boolean}
      >;

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

    const createServer = async (): Promise<void> => {
      const resolvedPort = port ?? (await getPort());
      console.log(`${logSymbols.info} Will use port ${resolvedPort} for Appium server`);
      (this as Mocha.Context & {port?: number}).port = resolvedPort;

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
    await createServer();
  });

  after(async function () {
    if (server) {
      await server.close();
    }
  });
}
