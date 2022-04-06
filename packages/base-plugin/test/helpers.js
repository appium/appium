/* eslint-disable no-console */
import { exec } from 'teen_process';
import { fs } from '@appium/support';
import { main as appiumServer } from 'appium';
import getPort from 'get-port';
import { info, success, warning } from 'log-symbols';

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
    let env = {...process.env};
    if (appiumHome) {
      env.APPIUM_HOME = appiumHome;
      await fs.mkdirp(appiumHome);
      console.log(`${info} Set \`APPIUM_HOME\` to ${appiumHome}`);
    }
    const oldTimeout = this.timeout();
    this.timeout(0);
    try {
      console.log(`${info} Checking if driver "${driverName}" is installed...`);
      let listArgs = [APPIUM_BIN, 'driver', 'list', '--json'];
      console.log(`${info} Running: ${process.execPath} ${listArgs.join(' ')}`);
      let {stdout} = await exec(process.execPath, listArgs, {
        env
      });
      let installed = JSON.parse(stdout);

      if (!installed[driverName]?.installed) {
        console.log(`${warning} Driver "${driverName}" not installed; installing...`);
        const driverArgs = [APPIUM_BIN, 'driver', 'install', '--source', driverSource, driverSpec];
        console.log(`${info} Running: ${process.execPath} ${driverArgs.join(' ')}`);
        if (driverPackage) {
          driverArgs.push('--package', driverPackage);
        }
        await exec(process.execPath, driverArgs, {
          env
        });
      }
      console.log(`${success} Installed driver "${driverName}"`);

      console.log(`${info} Checking if plugin "${pluginName}" is installed...`);
      listArgs = [APPIUM_BIN, 'plugin', 'list', '--json'];
      ({stdout} = await exec(process.execPath, listArgs, {
        env
      }));
      installed = JSON.parse(stdout);

      if (!installed[pluginName]?.installed) {
        console.log(`${warning} Plugin "${pluginName}" not installed; installing...`);
        const pluginArgs = [APPIUM_BIN, 'plugin', 'install', '--source', pluginSource, pluginSpec];
        console.log(`${info} Running: ${process.execPath} ${pluginArgs.join(' ')}`);
        if (pluginPackage) {
          pluginArgs.push('--package', pluginPackage);
        }
        await exec(process.execPath, pluginArgs, {
          env
        });
      }
      console.log(`${success} Installed plugin "${pluginName}"`);

      if (!port) {
        port = await getPort();
      }
      console.log(`${info} Will use port ${port} for Appium server`);
      this.port = port;

      const args = {port, host, usePlugins: [pluginName], useDrivers: [driverName], ...serverArgs};
      server = await appiumServer(args);
    } finally {
      this.timeout(oldTimeout);
    }
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
