/* eslint-disable no-console */
import { fs } from '@appium/support';
import { main as appiumServer } from 'appium';
import getPort from 'get-port';
import { info, success, warning } from 'log-symbols';
import { exec } from 'teen_process';

const APPIUM_BIN = require.resolve('appium');

function e2eSetup (opts = {}) {
  let {
    appiumHome,
    before,
    after,
    server,
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

  before(async function () {
    const setupAppiumHome = async () => {
      const env = {...process.env};

      if (appiumHome) {
        env.APPIUM_HOME = appiumHome;
        await fs.mkdirp(appiumHome);
        console.log(`${info} Set \`APPIUM_HOME\` to ${appiumHome}`);
      }

      return env;
    };

    const installDriver = async (env) => {
      console.log(`${info} Checking if driver "${driverName}" is installed...`);
      const driverListArgs = [APPIUM_BIN, 'driver', 'list', '--json'];
      console.log(
        `${info} Running: ${process.execPath} ${driverListArgs.join(' ')}`,
      );
      const {stdout: driverListJson} = await exec(
        process.execPath,
        driverListArgs,
        {
          env,
        },
      );
      const installedDrivers = JSON.parse(driverListJson);

      if (!installedDrivers[driverName]?.installed) {
        console.log(
          `${warning} Driver "${driverName}" not installed; installing...`,
        );
        const driverArgs = [
          APPIUM_BIN,
          'driver',
          'install',
          '--source',
          driverSource,
          driverSpec,
        ];
        if (driverPackage) {
          driverArgs.push('--package', driverPackage);
        }
        console.log(
          `${info} Running: ${process.execPath} ${driverArgs.join(' ')}`,
        );
        await exec(process.execPath, driverArgs, {
          env,
        });
      }
      console.log(`${success} Installed driver "${driverName}"`);
    };

    const installPlugin = async (env) => {
      console.log(`${info} Checking if plugin "${pluginName}" is installed...`);
      const pluginListArgs = [APPIUM_BIN, 'plugin', 'list', '--json'];
      const {stdout: pluginListJson} = await exec(
        process.execPath,
        pluginListArgs,
        {
          env,
        },
      );
      const installedPlugins = JSON.parse(pluginListJson);

      if (!installedPlugins[pluginName]?.installed) {
        console.log(
          `${warning} Plugin "${pluginName}" not installed; installing...`,
        );
        const pluginArgs = [
          APPIUM_BIN,
          'plugin',
          'install',
          '--source',
          pluginSource,
          pluginSpec,
        ];
        if (pluginPackage) {
          pluginArgs.push('--package', pluginPackage);
        }
        console.log(
          `${info} Running: ${process.execPath} ${pluginArgs.join(' ')}`,
        );
        await exec(process.execPath, pluginArgs, {
          env,
        });
      }
      console.log(`${success} Installed plugin "${pluginName}"`);
    };

    const createServer = async () => {
      if (!port) {
        port = await getPort();
      }
      console.log(`${info} Will use port ${port} for Appium server`);
      this.port = port;

      const args = {
        port,
        host,
        usePlugins: [pluginName],
        useDrivers: [driverName],
        ...serverArgs,
      };
      server = await appiumServer(args);
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
    if (appiumHome) {
      await fs.rimraf(appiumHome);
    }
  });

  return port;
}

export { e2eSetup };

